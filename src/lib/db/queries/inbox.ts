import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import {
  knowledgeFacts,
  leads,
  sites,
  unansweredQuestions,
  users,
  type questionNotify,
} from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import { ownerDisplayName } from "./chat";
import { ownsSite } from "./site-builder";

/*
 * Questions Inbox (Phase 6). Every function is scoped to the owner's site. Merged
 * questions (mergedIntoId set) are hidden children of their target: they share its
 * status, and answering the target resolves them too.
 */

export type QuestionStatus = "open" | "answered" | "ignored";
export type QuestionSort = "asked" | "recent";
export type QuestionNotify = (typeof questionNotify.enumValues)[number];

export type InboxQuestion = {
  id: string;
  question: string;
  askedCount: number;
  status: QuestionStatus;
  firstAskedAt: Date;
  lastAskedAt: Date;
  answeredAt: Date | null;
  /** Visitors waiting for an "answered" email. */
  waitingVisitors: number;
  /** Questions merged into this one (their wording, for context). */
  merged: string[];
  answer: { question: string; answer: string; visibility: "public" | "private" } | null;
};

export async function listQuestions(
  db: AppDb,
  ownerId: string,
  siteId: string,
  options: { status?: QuestionStatus; sort?: QuestionSort } = {},
): Promise<InboxQuestion[] | null> {
  if (!(await ownsSite(db, ownerId, siteId))) return null;
  const status = options.status ?? "open";
  const order =
    options.sort === "recent"
      ? [desc(unansweredQuestions.lastAskedAt)]
      : [desc(unansweredQuestions.askedCount), desc(unansweredQuestions.lastAskedAt)];

  const rows = await db
    .select({
      id: unansweredQuestions.id,
      question: unansweredQuestions.question,
      askedCount: unansweredQuestions.askedCount,
      status: unansweredQuestions.status,
      firstAskedAt: unansweredQuestions.firstAskedAt,
      lastAskedAt: unansweredQuestions.lastAskedAt,
      answeredAt: unansweredQuestions.answeredAt,
      factQuestion: knowledgeFacts.question,
      factAnswer: knowledgeFacts.answer,
      factVisibility: knowledgeFacts.visibility,
    })
    .from(unansweredQuestions)
    .leftJoin(knowledgeFacts, eq(knowledgeFacts.id, unansweredQuestions.answerFactId))
    .where(
      and(
        eq(unansweredQuestions.siteId, siteId),
        eq(unansweredQuestions.status, status),
        isNull(unansweredQuestions.mergedIntoId),
      ),
    )
    .orderBy(...order)
    .limit(200);
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [children, waiting] = await Promise.all([
    db
      .select({ parent: unansweredQuestions.mergedIntoId, question: unansweredQuestions.question })
      .from(unansweredQuestions)
      .where(
        and(eq(unansweredQuestions.siteId, siteId), inArray(unansweredQuestions.mergedIntoId, ids)),
      ),
    db
      .select({ questionId: leads.unansweredQuestionId, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        and(
          eq(leads.siteId, siteId),
          eq(leads.purpose, "notify_answer"),
          isNull(leads.notifiedAt),
          inArray(leads.unansweredQuestionId, ids),
        ),
      )
      .groupBy(leads.unansweredQuestionId),
  ]);

  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    askedCount: r.askedCount,
    status: r.status,
    firstAskedAt: r.firstAskedAt,
    lastAskedAt: r.lastAskedAt,
    answeredAt: r.answeredAt,
    waitingVisitors: Number(waiting.find((w) => w.questionId === r.id)?.count ?? 0),
    merged: children.filter((c) => c.parent === r.id).map((c) => c.question),
    answer:
      r.factQuestion !== null && r.factAnswer !== null && r.factVisibility !== null
        ? { question: r.factQuestion, answer: r.factAnswer, visibility: r.factVisibility }
        : null,
  }));
}

/** Counts per status for the filter tabs (top-level questions only). */
export async function countQuestionsByStatus(
  db: AppDb,
  siteId: string,
): Promise<Record<QuestionStatus, number>> {
  const rows = await db
    .select({ status: unansweredQuestions.status, count: sql<number>`count(*)::int` })
    .from(unansweredQuestions)
    .where(and(eq(unansweredQuestions.siteId, siteId), isNull(unansweredQuestions.mergedIntoId)))
    .groupBy(unansweredQuestions.status);
  const counts: Record<QuestionStatus, number> = { open: 0, answered: 0, ignored: 0 };
  for (const r of rows) counts[r.status] = Number(r.count);
  return counts;
}

/** A top-level question on the owner's site, or null. */
export async function getOwnedQuestion(
  db: AppDb,
  ownerId: string,
  questionId: string,
): Promise<{ id: string; siteId: string; question: string; status: QuestionStatus } | null> {
  const [row] = await db
    .select({
      id: unansweredQuestions.id,
      siteId: unansweredQuestions.siteId,
      question: unansweredQuestions.question,
      status: unansweredQuestions.status,
      mergedIntoId: unansweredQuestions.mergedIntoId,
    })
    .from(unansweredQuestions)
    .innerJoin(sites, eq(sites.id, unansweredQuestions.siteId))
    .where(and(eq(unansweredQuestions.id, questionId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!row || row.mergedIntoId) return null;
  return { id: row.id, siteId: row.siteId, question: row.question, status: row.status };
}

/** The question and everything merged into it. */
const familyOf = (id: string) =>
  or(eq(unansweredQuestions.id, id), eq(unansweredQuestions.mergedIntoId, id));

/** Ignore (or reopen) a question and its merged children. */
export async function setQuestionStatus(
  db: AppDb,
  ownerId: string,
  questionId: string,
  status: "open" | "ignored",
): Promise<boolean> {
  const q = await getOwnedQuestion(db, ownerId, questionId);
  if (!q || q.status === "answered") return false;
  await db
    .update(unansweredQuestions)
    .set({ status })
    .where(and(eq(unansweredQuestions.siteId, q.siteId), familyOf(q.id)));
  return true;
}

/** Deletes a question and its merged children (their waiting emails are dropped too). */
export async function deleteQuestion(
  db: AppDb,
  ownerId: string,
  questionId: string,
): Promise<boolean> {
  const q = await getOwnedQuestion(db, ownerId, questionId);
  if (!q) return false;
  await db.transaction(async (tx) => {
    const family = await tx
      .select({ id: unansweredQuestions.id })
      .from(unansweredQuestions)
      .where(and(eq(unansweredQuestions.siteId, q.siteId), familyOf(q.id)));
    const ids = family.map((f) => f.id);
    await tx
      .delete(leads)
      .where(
        and(
          eq(leads.siteId, q.siteId),
          inArray(leads.unansweredQuestionId, ids),
          isNull(leads.notifiedAt),
        ),
      );
    await tx.delete(unansweredQuestions).where(inArray(unansweredQuestions.id, ids));
  });
  return true;
}

/**
 * Merges `sourceId` (and anything already merged into it) into `targetId`: counts add up,
 * waiting visitors move to the target, and answering the target resolves all of them.
 * Both must be OPEN questions on the same site of this owner.
 */
export async function mergeQuestions(
  db: AppDb,
  ownerId: string,
  sourceId: string,
  targetId: string,
): Promise<boolean> {
  if (sourceId === targetId) return false;
  const [source, target] = await Promise.all([
    getOwnedQuestion(db, ownerId, sourceId),
    getOwnedQuestion(db, ownerId, targetId),
  ]);
  if (!source || !target || source.siteId !== target.siteId) return false;
  if (source.status !== "open" || target.status !== "open") return false;

  await db.transaction(async (tx) => {
    const [src] = await tx
      .select({
        askedCount: unansweredQuestions.askedCount,
        lastAskedAt: unansweredQuestions.lastAskedAt,
      })
      .from(unansweredQuestions)
      .where(eq(unansweredQuestions.id, source.id));
    const family = await tx
      .select({ id: unansweredQuestions.id })
      .from(unansweredQuestions)
      .where(and(eq(unansweredQuestions.siteId, source.siteId), familyOf(source.id)));
    const ids = family.map((f) => f.id);

    await tx
      .update(unansweredQuestions)
      .set({ mergedIntoId: target.id })
      .where(inArray(unansweredQuestions.id, ids));
    await tx
      .update(leads)
      .set({ unansweredQuestionId: target.id })
      .where(and(eq(leads.siteId, source.siteId), inArray(leads.unansweredQuestionId, ids)));
    await tx
      .update(unansweredQuestions)
      .set({
        askedCount: sql`${unansweredQuestions.askedCount} + ${src!.askedCount}`,
        lastAskedAt: sql`greatest(${unansweredQuestions.lastAskedAt}, ${src!.lastAskedAt.toISOString()}::timestamptz)`,
      })
      .where(eq(unansweredQuestions.id, target.id));
  });
  return true;
}

export type AnswerInput = {
  /** The fact's question (defaults to the visitor's wording, owner may tidy it). */
  question: string;
  answer: string;
  visibility: "public" | "private";
};

export type AnsweredQuestion = {
  factId: string;
  siteId: string;
  /** Visitors who asked to be emailed (not yet notified). */
  recipients: { leadId: string; email: string; question: string }[];
};

/**
 * Owner approves an answer: creates an APPROVED fact (source "inbox", linked to the
 * question) and marks the question and its merged children answered. The caller embeds
 * the fact and emails `recipients`. Public facts become retrievable for every future
 * visitor; private ones are only emailed to the askers (retrieval never returns them).
 */
export async function answerQuestion(
  db: AppDb,
  ownerId: string,
  questionId: string,
  input: AnswerInput,
): Promise<AnsweredQuestion | null> {
  const q = await getOwnedQuestion(db, ownerId, questionId);
  if (!q || q.status === "answered") return null;

  return db.transaction(async (tx) => {
    const now = new Date();
    const [fact] = await tx
      .insert(knowledgeFacts)
      .values({
        siteId: q.siteId,
        question: input.question,
        answer: input.answer,
        visibility: input.visibility,
        source: "inbox",
        status: "approved",
        sourceQuestionId: q.id,
        approvedAt: now,
        verifiedAt: now,
      })
      .returning({ id: knowledgeFacts.id });

    const family = await tx
      .update(unansweredQuestions)
      .set({ status: "answered", answeredAt: now, answerFactId: fact!.id })
      .where(and(eq(unansweredQuestions.siteId, q.siteId), familyOf(q.id)))
      .returning({ id: unansweredQuestions.id, question: unansweredQuestions.question });

    const waiting = await tx
      .select({ id: leads.id, email: leads.email, questionId: leads.unansweredQuestionId })
      .from(leads)
      .where(
        and(
          eq(leads.siteId, q.siteId),
          eq(leads.purpose, "notify_answer"),
          isNull(leads.notifiedAt),
          inArray(
            leads.unansweredQuestionId,
            family.map((f) => f.id),
          ),
        ),
      );

    return {
      factId: fact!.id,
      siteId: q.siteId,
      recipients: waiting.map((w) => ({
        leadId: w.id,
        email: w.email,
        question: family.find((f) => f.id === w.questionId)?.question ?? q.question,
      })),
    };
  });
}

export async function markLeadNotified(db: AppDb, leadId: string): Promise<void> {
  await db.update(leads).set({ notifiedAt: new Date() }).where(eq(leads.id, leadId));
}

export async function setQuestionNotify(
  db: AppDb,
  ownerId: string,
  siteId: string,
  value: QuestionNotify,
): Promise<boolean> {
  const rows = await db
    .update(sites)
    .set({ questionNotify: value })
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .returning({ id: sites.id });
  return rows.length > 0;
}

export async function getQuestionNotify(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<QuestionNotify | null> {
  const [row] = await db
    .select({ value: sites.questionNotify })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return row?.value ?? null;
}

/** Details for the visitor "answered" email. */
export async function siteEmailInfo(
  db: AppDb,
  siteId: string,
): Promise<{ owner: string; slug: string; published: boolean } | null> {
  const [site] = await db
    .select({ name: sites.name, slug: sites.slug, status: sites.status })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  if (!site) return null;
  return {
    owner: await ownerDisplayName(db, siteId, site.name),
    slug: site.slug,
    published: site.status === "published",
  };
}

export type OwnerQuestionAlert = {
  ownerEmail: string;
  ownerName: string;
  siteId: string;
  siteName: string;
  question: string;
};

/**
 * Claims the "new question" email for an instant-notify site: sets ownerNotifiedAt once
 * (so repeats of the same question never email again) and returns what to send, or null.
 */
export async function claimInstantAlert(
  db: AppDb,
  questionId: string,
): Promise<OwnerQuestionAlert | null> {
  const [q] = await db
    .select({
      siteId: unansweredQuestions.siteId,
      question: unansweredQuestions.question,
      notify: sites.questionNotify,
      siteName: sites.name,
      ownerEmail: users.email,
      ownerName: users.name,
    })
    .from(unansweredQuestions)
    .innerJoin(sites, eq(sites.id, unansweredQuestions.siteId))
    .innerJoin(users, eq(users.id, sites.ownerId))
    .where(and(eq(unansweredQuestions.id, questionId), isNull(unansweredQuestions.ownerNotifiedAt)))
    .limit(1);
  if (!q || q.notify !== "instant") return null;
  const claimed = await db
    .update(unansweredQuestions)
    .set({ ownerNotifiedAt: new Date() })
    .where(and(eq(unansweredQuestions.id, questionId), isNull(unansweredQuestions.ownerNotifiedAt)))
    .returning({ id: unansweredQuestions.id });
  if (!claimed.length) return null;
  return {
    ownerEmail: q.ownerEmail,
    ownerName: q.ownerName,
    siteId: q.siteId,
    siteName: q.siteName,
    question: q.question,
  };
}

export type DigestBatch = {
  ownerEmail: string;
  ownerName: string;
  sites: {
    siteId: string;
    siteName: string;
    questions: { question: string; askedCount: number }[];
  }[];
  questionIds: string[];
};

/**
 * Open questions on "daily" sites the owner hasn't been told about, grouped per owner.
 * Questions that switched to "daily" after being emailed instantly are not repeated.
 */
export async function pendingDigests(db: AppDb): Promise<DigestBatch[]> {
  const rows = await db
    .select({
      id: unansweredQuestions.id,
      question: unansweredQuestions.question,
      askedCount: unansweredQuestions.askedCount,
      siteId: sites.id,
      siteName: sites.name,
      ownerId: users.id,
      ownerEmail: users.email,
      ownerName: users.name,
    })
    .from(unansweredQuestions)
    .innerJoin(sites, eq(sites.id, unansweredQuestions.siteId))
    .innerJoin(users, eq(users.id, sites.ownerId))
    .where(
      and(
        eq(sites.questionNotify, "daily"),
        eq(unansweredQuestions.status, "open"),
        isNull(unansweredQuestions.mergedIntoId),
        isNull(unansweredQuestions.ownerNotifiedAt),
      ),
    )
    .orderBy(desc(unansweredQuestions.askedCount), desc(unansweredQuestions.lastAskedAt))
    .limit(2000);

  const byOwner = new Map<string, DigestBatch>();
  for (const r of rows) {
    let batch = byOwner.get(r.ownerId);
    if (!batch) {
      batch = { ownerEmail: r.ownerEmail, ownerName: r.ownerName, sites: [], questionIds: [] };
      byOwner.set(r.ownerId, batch);
    }
    let site = batch.sites.find((s) => s.siteId === r.siteId);
    if (!site) {
      site = { siteId: r.siteId, siteName: r.siteName, questions: [] };
      batch.sites.push(site);
    }
    site.questions.push({ question: r.question, askedCount: r.askedCount });
    batch.questionIds.push(r.id);
  }
  return [...byOwner.values()];
}

export async function markOwnerNotified(db: AppDb, questionIds: string[]): Promise<void> {
  if (!questionIds.length) return;
  await db
    .update(unansweredQuestions)
    .set({ ownerNotifiedAt: new Date() })
    .where(inArray(unansweredQuestions.id, questionIds));
}
