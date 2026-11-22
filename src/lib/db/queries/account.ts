import { asc, eq, inArray } from "drizzle-orm";

import {
  aiSettings,
  conversations,
  knowledgeFacts,
  leads,
  messages,
  siteDailyStats,
  sites,
  siteSections,
  subscriptions,
  unansweredQuestions,
  usageLogs,
  users,
} from "../schema";
import type { AppDb } from "../types";

/**
 * Everything we hold about one account, as plain JSON (GDPR-style export). Never
 * includes secrets: no password hashes, sessions, encrypted API keys or embeddings.
 */
export async function exportAccountData(db: AppDb, userId: string) {
  const [user] = await db
    .select({ name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;
  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const siteRows = await db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      kind: sites.kind,
      template: sites.template,
      status: sites.status,
      theme: sites.theme,
      seo: sites.seo,
      createdAt: sites.createdAt,
    })
    .from(sites)
    .where(eq(sites.ownerId, userId));
  const ids = siteRows.map((s) => s.id);
  const bySite = <T extends { siteId: string }>(rows: T[], id: string) =>
    rows
      .filter((r) => r.siteId === id)
      .map((r) => {
        const rest: Partial<T> = { ...r };
        delete rest.siteId;
        return rest as Omit<T, "siteId">;
      });

  const [sections, facts, questions, convs, leadRows, ai, stats] = ids.length
    ? await Promise.all([
        db
          .select({
            siteId: siteSections.siteId,
            type: siteSections.type,
            position: siteSections.position,
            content: siteSections.content,
          })
          .from(siteSections)
          .where(inArray(siteSections.siteId, ids))
          .orderBy(asc(siteSections.position)),
        db
          .select({
            siteId: knowledgeFacts.siteId,
            question: knowledgeFacts.question,
            answer: knowledgeFacts.answer,
            status: knowledgeFacts.status,
            visibility: knowledgeFacts.visibility,
            source: knowledgeFacts.source,
            expiresAt: knowledgeFacts.expiresAt,
            createdAt: knowledgeFacts.createdAt,
          })
          .from(knowledgeFacts)
          .where(inArray(knowledgeFacts.siteId, ids)),
        db
          .select({
            siteId: unansweredQuestions.siteId,
            question: unansweredQuestions.question,
            askedCount: unansweredQuestions.askedCount,
            status: unansweredQuestions.status,
            firstAskedAt: unansweredQuestions.firstAskedAt,
          })
          .from(unansweredQuestions)
          .where(inArray(unansweredQuestions.siteId, ids)),
        db
          .select({
            siteId: conversations.siteId,
            id: conversations.id,
            startedAt: conversations.startedAt,
          })
          .from(conversations)
          .where(inArray(conversations.siteId, ids)),
        db
          .select({
            siteId: leads.siteId,
            email: leads.email,
            purpose: leads.purpose,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .where(inArray(leads.siteId, ids)),
        db
          .select({
            siteId: aiSettings.siteId,
            mode: aiSettings.mode,
            provider: aiSettings.provider,
            model: aiSettings.model,
            apiKeyLast4: aiSettings.apiKeyLast4,
            allowGeneralAnswers: aiSettings.allowGeneralAnswers,
            botName: aiSettings.botName,
            greeting: aiSettings.greeting,
            tone: aiSettings.tone,
          })
          .from(aiSettings)
          .where(inArray(aiSettings.siteId, ids)),
        db
          .select({
            siteId: siteDailyStats.siteId,
            day: siteDailyStats.day,
            visits: siteDailyStats.visits,
          })
          .from(siteDailyStats)
          .where(inArray(siteDailyStats.siteId, ids)),
      ])
    : [[], [], [], [], [], [], []];

  const convIds = convs.map((c) => c.id);
  const msgs = convIds.length
    ? await db
        .select({
          conversationId: messages.conversationId,
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(inArray(messages.conversationId, convIds))
        .orderBy(asc(messages.createdAt))
    : [];

  return {
    exportedAt: new Date().toISOString(),
    account: { ...user, plan: subscription ?? null },
    sites: siteRows.map((s) => ({
      ...s,
      sections: bySite(sections, s.id),
      knowledgeFacts: bySite(facts, s.id),
      visitorQuestions: bySite(questions, s.id),
      visitorEmails: bySite(leadRows, s.id),
      aiSettings: bySite(ai, s.id)[0] ?? null,
      dailyVisits: bySite(stats, s.id),
      conversations: convs
        .filter((c) => c.siteId === s.id)
        .map((c) => ({
          startedAt: c.startedAt,
          messages: msgs
            .filter((m) => m.conversationId === c.id)
            .map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
        })),
    })),
  };
}

/**
 * Permanently deletes the account. Sites (and their sections, facts, questions, chats,
 * visitor emails, stats), sessions, subscription and usage all cascade from users.
 * Returns the deleted sites' slugs so their cached pages can be dropped.
 */
export async function deleteAccount(db: AppDb, userId: string): Promise<string[] | null> {
  const owned = await db.select({ slug: sites.slug }).from(sites).where(eq(sites.ownerId, userId));
  // usage_logs.site_id is SET NULL on site delete; remove the user's rows explicitly too.
  await db.delete(usageLogs).where(eq(usageLogs.userId, userId));
  const rows = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  return rows.length ? owned.map((s) => s.slug) : null;
}
