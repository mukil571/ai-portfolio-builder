import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { knowledgeFacts, knowledgeFiles, sites } from "../schema";
import type { AppDb } from "../types";

/*
 * Knowledge base data access. Owner-facing functions are scoped by the authenticated
 * owner's id: a fact on a site they don't own behaves exactly like a missing fact.
 * Retrieval for visitors lives in lib/knowledge/retrieval.ts (scoped by site).
 */

export type FactSource = "manual" | "wizard" | "file" | "resume" | "inbox";
export type FactStatus = "proposed" | "approved" | "rejected";
export type FactVisibility = "public" | "private";

export type FactSummary = {
  id: string;
  question: string;
  answer: string;
  source: FactSource;
  status: FactStatus;
  visibility: FactVisibility;
  expiresAt: Date | null;
  /** True when the fact has an embedding (i.e. the assistant can find it). */
  searchable: boolean;
  createdAt: Date;
};

export type FactInput = {
  question: string;
  answer: string;
  visibility: FactVisibility;
  expiresAt: Date | null;
};

/** Sites owned by `ownerId`, as a subquery for ownership scoping. */
function ownedSiteIds(db: AppDb, ownerId: string) {
  return db.select({ id: sites.id }).from(sites).where(eq(sites.ownerId, ownerId));
}

async function ownsSite(db: AppDb, ownerId: string, siteId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return Boolean(row);
}

const summaryColumns = {
  id: knowledgeFacts.id,
  question: knowledgeFacts.question,
  answer: knowledgeFacts.answer,
  source: knowledgeFacts.source,
  status: knowledgeFacts.status,
  visibility: knowledgeFacts.visibility,
  expiresAt: knowledgeFacts.expiresAt,
  searchable: sql<boolean>`${knowledgeFacts.embedding} is not null`,
  createdAt: knowledgeFacts.createdAt,
};

/** All non-rejected facts for the owner's site, newest first. Null if not their site. */
export async function listFacts(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<FactSummary[] | null> {
  if (!(await ownsSite(db, ownerId, siteId))) return null;
  const rows = await db
    .select(summaryColumns)
    .from(knowledgeFacts)
    .where(
      and(
        eq(knowledgeFacts.siteId, siteId),
        inArray(knowledgeFacts.status, ["proposed", "approved"]),
      ),
    )
    .orderBy(desc(knowledgeFacts.createdAt));
  return rows.map((r) => ({ ...r, searchable: Boolean(r.searchable) }));
}

/** Adds an owner-written fact, approved immediately (the owner wrote it). */
export async function createApprovedFact(
  db: AppDb,
  ownerId: string,
  siteId: string,
  input: FactInput,
): Promise<string | null> {
  if (!(await ownsSite(db, ownerId, siteId))) return null;
  const now = new Date();
  const [row] = await db
    .insert(knowledgeFacts)
    .values({
      siteId,
      ...input,
      source: "manual",
      status: "approved",
      approvedAt: now,
      verifiedAt: now,
    })
    .returning({ id: knowledgeFacts.id });
  return row!.id;
}

/**
 * Adds suggested facts as PROPOSED (never retrievable until the owner approves).
 * Skips questions the site already has (case-insensitive). Returns how many were added.
 */
export async function createProposedFacts(
  db: AppDb,
  ownerId: string,
  siteId: string,
  items: { question: string; answer: string }[],
  source: FactSource,
  fileId: string | null = null,
): Promise<number | null> {
  if (!(await ownsSite(db, ownerId, siteId))) return null;
  const existing = await db
    .select({ question: knowledgeFacts.question })
    .from(knowledgeFacts)
    .where(eq(knowledgeFacts.siteId, siteId));
  const seen = new Set(existing.map((e) => e.question.trim().toLowerCase()));
  const fresh = items.filter((item) => {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (fresh.length === 0) return 0;
  await db.insert(knowledgeFacts).values(
    fresh.map((item) => ({
      siteId,
      question: item.question.trim(),
      answer: item.answer.trim(),
      source,
      status: "proposed" as const,
      fileId,
    })),
  );
  return fresh.length;
}

/**
 * Edits a fact. If its wording changed, the old embedding is dropped so a stale
 * vector is never retrieved; the caller re-indexes approved facts.
 */
export async function updateFact(
  db: AppDb,
  ownerId: string,
  factId: string,
  input: FactInput,
): Promise<{ status: FactStatus } | null> {
  const [current] = await db
    .select({
      question: knowledgeFacts.question,
      answer: knowledgeFacts.answer,
      status: knowledgeFacts.status,
    })
    .from(knowledgeFacts)
    .where(
      and(eq(knowledgeFacts.id, factId), inArray(knowledgeFacts.siteId, ownedSiteIds(db, ownerId))),
    )
    .limit(1);
  if (!current) return null;
  const textChanged = current.question !== input.question || current.answer !== input.answer;
  await db
    .update(knowledgeFacts)
    .set({
      ...input,
      verifiedAt: current.status === "approved" ? new Date() : undefined,
      ...(textChanged ? { embedding: null, embeddingModel: null } : {}),
    })
    .where(eq(knowledgeFacts.id, factId));
  return { status: current.status };
}

/** Approve (counts for the assistant) or reject (hidden, kept to avoid re-suggesting). */
export async function setFactStatus(
  db: AppDb,
  ownerId: string,
  factId: string,
  status: "approved" | "rejected",
): Promise<boolean> {
  const now = new Date();
  const updated = await db
    .update(knowledgeFacts)
    .set(
      status === "approved"
        ? { status, approvedAt: now, verifiedAt: now }
        : { status, embedding: null, embeddingModel: null },
    )
    .where(
      and(eq(knowledgeFacts.id, factId), inArray(knowledgeFacts.siteId, ownedSiteIds(db, ownerId))),
    )
    .returning({ id: knowledgeFacts.id });
  return updated.length > 0;
}

export async function deleteFact(db: AppDb, ownerId: string, factId: string): Promise<boolean> {
  const deleted = await db
    .delete(knowledgeFacts)
    .where(
      and(eq(knowledgeFacts.id, factId), inArray(knowledgeFacts.siteId, ownedSiteIds(db, ownerId))),
    )
    .returning({ id: knowledgeFacts.id });
  return deleted.length > 0;
}

/** Approved facts of the owner's site that still need an embedding (for "retry"). */
export async function listUnindexedFactIds(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<string[]> {
  if (!(await ownsSite(db, ownerId, siteId))) return [];
  const rows = await db
    .select({ id: knowledgeFacts.id })
    .from(knowledgeFacts)
    .where(
      and(
        eq(knowledgeFacts.siteId, siteId),
        eq(knowledgeFacts.status, "approved"),
        sql`${knowledgeFacts.embedding} is null`,
      ),
    );
  return rows.map((r) => r.id);
}

/** Records an uploaded file (original not stored). */
export async function createKnowledgeFileRecord(
  db: AppDb,
  ownerId: string,
  siteId: string,
  meta: { filename: string; mimeType: string; sizeBytes: number },
): Promise<string | null> {
  if (!(await ownsSite(db, ownerId, siteId))) return null;
  const [row] = await db
    .insert(knowledgeFiles)
    .values({ siteId, ...meta, storageKey: null, status: "processing" })
    .returning({ id: knowledgeFiles.id });
  return row!.id;
}

export async function setKnowledgeFileStatus(
  db: AppDb,
  fileId: string,
  status: "processed" | "failed",
  error: string | null = null,
): Promise<void> {
  await db.update(knowledgeFiles).set({ status, error }).where(eq(knowledgeFiles.id, fileId));
}
