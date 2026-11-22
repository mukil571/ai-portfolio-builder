import { and, count, eq, gte, inArray, sql } from "drizzle-orm";

import {
  aiSettings,
  conversations,
  leads,
  messages,
  sites,
  siteSections,
  unansweredQuestions,
} from "../schema";
import type { AppDb } from "../types";

/*
 * Visitor chat data access. Public functions are scoped to a PUBLISHED site (by slug or
 * id); owner functions are scoped by the authenticated owner's id.
 */

export type ChatSite = {
  siteId: string;
  slug: string;
  owner: string;
  mode: "none" | "byok" | "platform";
  allowGeneralAnswers: boolean;
};

/** Chat settings for a published site; null for drafts/unknown slugs. */
export async function getChatSite(db: AppDb, slug: string): Promise<ChatSite | null> {
  const [row] = await db
    .select({
      siteId: sites.id,
      slug: sites.slug,
      name: sites.name,
      mode: aiSettings.mode,
      allowGeneralAnswers: aiSettings.allowGeneralAnswers,
    })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.slug, slug), eq(sites.status, "published")))
    .limit(1);
  if (!row) return null;
  return {
    siteId: row.siteId,
    slug: row.slug,
    owner: await ownerDisplayName(db, row.siteId, row.name),
    mode: row.mode ?? "none",
    allowGeneralAnswers: row.allowGeneralAnswers ?? false,
  };
}

/** The name visitors know: the hero name, else the site name. */
export async function ownerDisplayName(
  db: AppDb,
  siteId: string,
  fallback: string,
): Promise<string> {
  const [hero] = await db
    .select({ content: siteSections.content })
    .from(siteSections)
    .where(and(eq(siteSections.siteId, siteId), eq(siteSections.type, "hero")))
    .limit(1);
  const name = (hero?.content as { name?: unknown } | undefined)?.name;
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : fallback;
}

/** Reuses the visitor's conversation on this site, or starts one. */
export async function getOrCreateConversation(
  db: AppDb,
  input: {
    siteId: string;
    visitorId: string;
    ipHash: string;
    userAgent: string | null;
    conversationId?: string;
  },
): Promise<string> {
  if (input.conversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, input.conversationId),
          eq(conversations.siteId, input.siteId),
          eq(conversations.visitorId, input.visitorId),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
  }
  const [created] = await db
    .insert(conversations)
    .values({
      siteId: input.siteId,
      visitorId: input.visitorId,
      ipHash: input.ipHash,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    })
    .returning({ id: conversations.id });
  return created!.id;
}

export type StoredReply = {
  content: string;
  intent: "owner_fact" | "general_tech" | "off_topic" | "unknown" | null;
  factIds: string[];
  unansweredQuestionId: string | null;
  provider: string | null;
  model: string | null;
};

/** Saves the visitor message and the assistant reply. */
export async function saveExchange(
  db: AppDb,
  conversationId: string,
  visitorText: string,
  reply: StoredReply,
): Promise<void> {
  await db.insert(messages).values([
    {
      conversationId,
      role: "visitor",
      content: visitorText,
      unansweredQuestionId: reply.unansweredQuestionId,
    },
    { conversationId, role: "assistant", ...reply },
  ]);
  await db
    .update(conversations)
    .set({ messageCount: sql`${conversations.messageCount} + 2`, lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

/** Visitor messages from this hashed IP since `since` (all sites). */
export async function countRecentByIp(db: AppDb, ipHash: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.ipHash, ipHash),
        eq(messages.role, "visitor"),
        gte(messages.createdAt, since),
      ),
    );
  return Number(row?.n ?? 0);
}

/** Visitor messages on this site since `since`. */
export async function countRecentBySite(db: AppDb, siteId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.siteId, siteId),
        eq(messages.role, "visitor"),
        gte(messages.createdAt, since),
      ),
    );
  return Number(row?.n ?? 0);
}

/**
 * "Email me when answered": only for a question that belongs to this site. Repeats for
 * the same email + question are ignored. Returns false if the question isn't this site's.
 */
export async function createNotifyLead(
  db: AppDb,
  input: {
    siteId: string;
    unansweredQuestionId: string;
    email: string;
    conversationId: string | null;
  },
): Promise<boolean> {
  const [question] = await db
    .select({ id: unansweredQuestions.id })
    .from(unansweredQuestions)
    .where(
      and(
        eq(unansweredQuestions.id, input.unansweredQuestionId),
        eq(unansweredQuestions.siteId, input.siteId),
      ),
    )
    .limit(1);
  if (!question) return false;

  const [dup] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.unansweredQuestionId, question.id), eq(leads.email, input.email)))
    .limit(1);
  if (dup) return true;

  let conversationId = input.conversationId;
  if (conversationId) {
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.siteId, input.siteId)))
      .limit(1);
    conversationId = conv?.id ?? null;
  }
  await db.insert(leads).values({
    siteId: input.siteId,
    email: input.email,
    purpose: "notify_answer",
    unansweredQuestionId: question.id,
    conversationId,
  });
  return true;
}

/**
 * Owner turns the assistant on/off. On = the owner's own key when one is saved, otherwise
 * Loriyum's AI (counted against the plan). Owner-scoped.
 */
export async function setAssistant(
  db: AppDb,
  ownerId: string,
  siteId: string,
  settings: { enabled: boolean; allowGeneralAnswers: boolean },
): Promise<{ slug: string } | null> {
  const [site] = await db
    .select({ id: sites.id, slug: sites.slug, keyLast4: aiSettings.apiKeyLast4 })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!site) return null;
  const mode = settings.enabled ? (site.keyLast4 ? "byok" : "platform") : "none";
  await db
    .insert(aiSettings)
    .values({ siteId, mode, allowGeneralAnswers: settings.allowGeneralAnswers })
    .onConflictDoUpdate({
      target: aiSettings.siteId,
      set: { mode, allowGeneralAnswers: settings.allowGeneralAnswers },
    });
  return { slug: site.slug };
}

/** Owner view of the assistant settings. */
export async function getAssistantSettings(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<{ enabled: boolean; allowGeneralAnswers: boolean } | null> {
  const [row] = await db
    .select({ mode: aiSettings.mode, allowGeneralAnswers: aiSettings.allowGeneralAnswers })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!row) return null;
  return {
    enabled: row.mode === "platform" || row.mode === "byok",
    allowGeneralAnswers: row.allowGeneralAnswers ?? false,
  };
}

/** Public: is the assistant enabled for these published site ids? */
export async function assistantEnabledFor(db: AppDb, siteIds: string[]): Promise<Set<string>> {
  if (siteIds.length === 0) return new Set();
  const rows = await db
    .select({ siteId: aiSettings.siteId })
    .from(aiSettings)
    .where(
      and(inArray(aiSettings.siteId, siteIds), inArray(aiSettings.mode, ["platform", "byok"])),
    );
  return new Set(rows.map((r) => r.siteId));
}

/** Spam signals for a conversation: total messages and the latest visitor message. */
export async function conversationActivity(
  db: AppDb,
  conversationId: string,
): Promise<{ messageCount: number; lastVisitor: { content: string; createdAt: Date } | null }> {
  const [conv] = await db
    .select({ messageCount: conversations.messageCount })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  const [last] = await db
    .select({ content: messages.content, createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.role, "visitor")))
    .orderBy(sql`${messages.createdAt} desc`)
    .limit(1);
  return { messageCount: conv?.messageCount ?? 0, lastVisitor: last ?? null };
}
