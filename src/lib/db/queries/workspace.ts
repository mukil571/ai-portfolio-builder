import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { extractNumbers } from "@/lib/ai/number-check";

import {
  conversations,
  knowledgeFacts,
  leads,
  messages,
  siteDailyStats,
  sites,
  unansweredQuestions,
} from "../schema";
import type { AppDb } from "../types";

/*
 * Site workspace (Phase 9): overview, conversations, leads, analytics, conflicts,
 * unpublish/delete. Owner functions are scoped by owner id; recordVisit is public but
 * only counts PUBLISHED sites and stores nothing about the visitor.
 */

const DAY = 24 * 60 * 60 * 1000;
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

async function ownedSite(db: AppDb, ownerId: string, siteId: string) {
  const [row] = await db
    .select({ id: sites.id, slug: sites.slug, status: sites.status, name: sites.name })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

/** +1 page view today for a published site (no-op for drafts / unknown slugs). */
export async function recordVisit(db: AppDb, slug: string, now = new Date()): Promise<boolean> {
  const [site] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.slug, slug), eq(sites.status, "published")))
    .limit(1);
  if (!site) return false;
  await db
    .insert(siteDailyStats)
    .values({ siteId: site.id, day: utcDay(now), visits: 1 })
    .onConflictDoUpdate({
      target: [siteDailyStats.siteId, siteDailyStats.day],
      set: { visits: sql`${siteDailyStats.visits} + 1` },
    });
  return true;
}

export type Outcomes = { answered: number; escalated: number; general: number; other: number };

/** Assistant replies in the window, by outcome (answered from facts / passed to owner / …). */
async function outcomes(db: AppDb, siteId: string, since: Date): Promise<Outcomes> {
  const [row] = await db
    .select({
      answered: sql<number>`count(*) filter (where cardinality(${messages.factIds}) > 0)::int`,
      escalated: sql<number>`count(*) filter (where ${messages.unansweredQuestionId} is not null)::int`,
      general: sql<number>`count(*) filter (where ${messages.intent} = 'general_tech' and cardinality(${messages.factIds}) = 0 and ${messages.unansweredQuestionId} is null)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.siteId, siteId),
        eq(messages.role, "assistant"),
        gte(messages.createdAt, since),
      ),
    );
  const answered = Number(row?.answered ?? 0);
  const escalated = Number(row?.escalated ?? 0);
  const general = Number(row?.general ?? 0);
  return {
    answered,
    escalated,
    general,
    other: Math.max(0, Number(row?.total ?? 0) - answered - escalated - general),
  };
}

export type Overview = {
  site: { name: string; slug: string; status: "draft" | "published" };
  /** Oldest first, one entry per day for the last 30 days (zeros included). */
  visitsByDay: { day: string; visits: number }[];
  visits7: number;
  visits30: number;
  chats30: number;
  outcomes30: Outcomes;
  openQuestions: number;
  leads30: number;
};

export async function getOverview(
  db: AppDb,
  ownerId: string,
  siteId: string,
  now = new Date(),
): Promise<Overview | null> {
  const site = await ownedSite(db, ownerId, siteId);
  if (!site) return null;
  const since30 = new Date(now.getTime() - 30 * DAY);
  const firstDay = utcDay(new Date(now.getTime() - 29 * DAY));

  const [visitRows, [chats], out, [open], [leadRow]] = await Promise.all([
    db
      .select({ day: siteDailyStats.day, visits: siteDailyStats.visits })
      .from(siteDailyStats)
      .where(and(eq(siteDailyStats.siteId, siteId), gte(siteDailyStats.day, firstDay))),
    db
      .select({ n: count() })
      .from(conversations)
      .where(and(eq(conversations.siteId, siteId), gte(conversations.startedAt, since30))),
    outcomes(db, siteId, since30),
    db
      .select({ n: count() })
      .from(unansweredQuestions)
      .where(
        and(
          eq(unansweredQuestions.siteId, siteId),
          eq(unansweredQuestions.status, "open"),
          sql`${unansweredQuestions.mergedIntoId} is null`,
        ),
      ),
    db
      .select({ n: count() })
      .from(leads)
      .where(and(eq(leads.siteId, siteId), gte(leads.createdAt, since30))),
  ]);

  const byDay = new Map(visitRows.map((r) => [r.day, r.visits]));
  const visitsByDay = Array.from({ length: 30 }, (_, i) => {
    const day = utcDay(new Date(now.getTime() - (29 - i) * DAY));
    return { day, visits: byDay.get(day) ?? 0 };
  });
  return {
    site: { name: site.name, slug: site.slug, status: site.status },
    visitsByDay,
    visits7: visitsByDay.slice(-7).reduce((n, d) => n + d.visits, 0),
    visits30: visitsByDay.reduce((n, d) => n + d.visits, 0),
    chats30: Number(chats?.n ?? 0),
    outcomes30: out,
    openQuestions: Number(open?.n ?? 0),
    leads30: Number(leadRow?.n ?? 0),
  };
}

export type ConversationSummary = {
  id: string;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  firstMessage: string | null;
};

/** Latest conversations (with at least one message), newest first. */
export async function listConversations(
  db: AppDb,
  ownerId: string,
  siteId: string,
  limit = 100,
): Promise<ConversationSummary[] | null> {
  if (!(await ownedSite(db, ownerId, siteId))) return null;
  const rows = await db
    .select({
      id: conversations.id,
      startedAt: conversations.startedAt,
      lastMessageAt: conversations.lastMessageAt,
      messageCount: conversations.messageCount,
    })
    .from(conversations)
    .where(and(eq(conversations.siteId, siteId), sql`${conversations.messageCount} > 0`))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
  if (!rows.length) return [];
  const firsts = await db
    .selectDistinctOn([messages.conversationId], {
      conversationId: messages.conversationId,
      content: messages.content,
    })
    .from(messages)
    .where(
      and(
        inArray(
          messages.conversationId,
          rows.map((r) => r.id),
        ),
        eq(messages.role, "visitor"),
      ),
    )
    .orderBy(messages.conversationId, asc(messages.createdAt));
  const first = new Map(firsts.map((f) => [f.conversationId, f.content]));
  return rows.map((r) => ({ ...r, firstMessage: first.get(r.id) ?? null }));
}

export type TranscriptMessage = {
  id: string;
  role: "visitor" | "assistant";
  content: string;
  createdAt: Date;
  answered: boolean;
  escalated: boolean;
};

/** One conversation's messages, if it belongs to one of the owner's sites. */
export async function getTranscript(
  db: AppDb,
  ownerId: string,
  siteId: string,
  conversationId: string,
): Promise<{ startedAt: Date; messages: TranscriptMessage[] } | null> {
  const [conv] = await db
    .select({ startedAt: conversations.startedAt })
    .from(conversations)
    .innerJoin(sites, eq(sites.id, conversations.siteId))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.siteId, siteId),
        eq(sites.ownerId, ownerId),
      ),
    )
    .limit(1);
  if (!conv) return null;
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
      factIds: messages.factIds,
      unansweredQuestionId: messages.unansweredQuestionId,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt), asc(messages.role));
  return {
    startedAt: conv.startedAt,
    messages: rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      answered: m.role === "assistant" && m.factIds.length > 0,
      escalated: m.role === "assistant" && m.unansweredQuestionId !== null,
    })),
  };
}

export type LeadRow = {
  email: string;
  purpose: "notify_answer" | "contact";
  question: string | null;
  notifiedAt: Date | null;
  createdAt: Date;
};

export async function listLeads(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<LeadRow[] | null> {
  if (!(await ownedSite(db, ownerId, siteId))) return null;
  return db
    .select({
      email: leads.email,
      purpose: leads.purpose,
      question: unansweredQuestions.question,
      notifiedAt: leads.notifiedAt,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .leftJoin(unansweredQuestions, eq(unansweredQuestions.id, leads.unansweredQuestionId))
    .where(eq(leads.siteId, siteId))
    .orderBy(desc(leads.createdAt))
    .limit(5000);
}

export type Analytics = {
  outcomes: Outcomes;
  topQuestions: { question: string; askedCount: number; status: "open" | "answered" | "ignored" }[];
  topFacts: { id: string; question: string; uses: number }[];
  /** Share of owner-fact questions answered from facts (0-1), or null with no data. */
  coverage: number | null;
};

export async function getAnalytics(
  db: AppDb,
  ownerId: string,
  siteId: string,
  days = 30,
  now = new Date(),
): Promise<Analytics | null> {
  if (!(await ownedSite(db, ownerId, siteId))) return null;
  const since = new Date(now.getTime() - days * DAY);
  const [out, topQuestions, factUses] = await Promise.all([
    outcomes(db, siteId, since),
    db
      .select({
        question: unansweredQuestions.question,
        askedCount: unansweredQuestions.askedCount,
        status: unansweredQuestions.status,
      })
      .from(unansweredQuestions)
      .where(
        and(
          eq(unansweredQuestions.siteId, siteId),
          sql`${unansweredQuestions.mergedIntoId} is null`,
          gte(unansweredQuestions.lastAskedAt, since),
        ),
      )
      .orderBy(desc(unansweredQuestions.askedCount), desc(unansweredQuestions.lastAskedAt))
      .limit(10),
    db.execute<{ id: string; uses: number }>(sql`
      select f.fact_id as id, count(*)::int as uses
      from ${messages} m
      join ${conversations} c on c.id = m.conversation_id
      cross join lateral unnest(m.fact_ids) as f(fact_id)
      where c.site_id = ${siteId} and m.role = 'assistant' and m.created_at >= ${since.toISOString()}::timestamptz
      group by f.fact_id
      order by uses desc
      limit 10
    `),
  ]);
  const useRows = (factUses as unknown as { rows: { id: string; uses: number }[] }).rows;
  const facts = useRows.length
    ? await db
        .select({ id: knowledgeFacts.id, question: knowledgeFacts.question })
        .from(knowledgeFacts)
        .where(
          and(
            eq(knowledgeFacts.siteId, siteId),
            inArray(
              knowledgeFacts.id,
              useRows.map((r) => r.id),
            ),
          ),
        )
    : [];
  const title = new Map(facts.map((f) => [f.id, f.question]));
  const ownerAsked = out.answered + out.escalated;
  return {
    outcomes: out,
    topQuestions,
    topFacts: useRows
      .filter((r) => title.has(r.id))
      .map((r) => ({ id: r.id, question: title.get(r.id)!, uses: Number(r.uses) })),
    coverage: ownerAsked ? out.answered / ownerAsked : null,
  };
}

export type FactConflict = {
  a: { id: string; question: string; answer: string };
  b: { id: string; question: string; answer: string };
};

/** Similarity above which two facts are "about the same thing". */
export const CONFLICT_MIN_SIMILARITY = 0.8;

/**
 * Pairs of approved, public facts that look like they're about the same thing (embedding
 * similarity) but state different numbers, e.g. two different hourly rates. A hint for
 * the owner, not a block: wording differences can be intentional.
 */
export async function findFactConflicts(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<FactConflict[] | null> {
  if (!(await ownedSite(db, ownerId, siteId))) return null;
  const pairs = await db.execute<{
    a_id: string;
    a_q: string;
    a_a: string;
    b_id: string;
    b_q: string;
    b_a: string;
  }>(sql`
    select a.id as a_id, a.question as a_q, a.answer as a_a,
           b.id as b_id, b.question as b_q, b.answer as b_a
    from ${knowledgeFacts} a
    join ${knowledgeFacts} b
      on b.site_id = a.site_id and a.id < b.id and b.embedding_model = a.embedding_model
    where a.site_id = ${siteId}
      and a.status = 'approved' and b.status = 'approved'
      and a.visibility = 'public' and b.visibility = 'public'
      and a.embedding is not null and b.embedding is not null
      and 1 - (a.embedding <=> b.embedding) >= ${CONFLICT_MIN_SIMILARITY}
    limit 200
  `);
  const rows = (pairs as unknown as { rows: Record<string, string>[] }).rows;
  return rows
    .filter((r) => {
      const na = new Set(extractNumbers(r.a_a!));
      const nb = new Set(extractNumbers(r.b_a!));
      if (!na.size || !nb.size) return false;
      return [...na].some((n) => !nb.has(n)) || [...nb].some((n) => !na.has(n));
    })
    .map((r) => ({
      a: { id: r.a_id!, question: r.a_q!, answer: r.a_a! },
      b: { id: r.b_id!, question: r.b_q!, answer: r.b_a! },
    }));
}

/** Takes a published site offline (back to draft). Returns its slug for cache refresh. */
export async function unpublishSite(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<{ slug: string } | null> {
  const rows = await db
    .update(sites)
    .set({ status: "draft" })
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId), eq(sites.status, "published")))
    .returning({ slug: sites.slug });
  return rows[0] ?? null;
}

/** Deletes a site and everything in it (sections, facts, chats, leads cascade). */
export async function deleteSite(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<{ slug: string } | null> {
  const rows = await db
    .delete(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .returning({ slug: sites.slug });
  return rows[0] ?? null;
}
