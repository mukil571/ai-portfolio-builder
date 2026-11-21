import { and, asc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";

import { knowledgeFacts } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import { EMBEDDING_MODEL } from "./embedding-config";
import type { Embedder } from "./indexing";
import { cosineSimilarity } from "./similarity";

export type RetrievedFact = { id: string; question: string; answer: string; score: number };

/**
 * Top-k facts for ONE site by exact cosine similarity (no ANN index; see decision log).
 * Golden Rule gate: only APPROVED, PUBLIC, non-expired facts embedded with the current
 * platform model are candidates. Proposed/rejected/private/expired facts never come back.
 */
export async function retrieveFacts(
  db: AppDb,
  siteId: string,
  queryVector: number[],
  options: { k?: number; model?: string; now?: Date } = {},
): Promise<RetrievedFact[]> {
  const k = Math.min(Math.max(options.k ?? 5, 1), 20);
  const model = options.model ?? EMBEDDING_MODEL;
  const now = options.now ?? new Date();
  const score = cosineSimilarity(knowledgeFacts.embedding, queryVector);

  const rows = await db
    .select({
      id: knowledgeFacts.id,
      question: knowledgeFacts.question,
      answer: knowledgeFacts.answer,
      score,
    })
    .from(knowledgeFacts)
    .where(
      and(
        eq(knowledgeFacts.siteId, siteId),
        eq(knowledgeFacts.status, "approved"),
        eq(knowledgeFacts.visibility, "public"),
        isNotNull(knowledgeFacts.embedding),
        eq(knowledgeFacts.embeddingModel, model),
        or(isNull(knowledgeFacts.expiresAt), gt(knowledgeFacts.expiresAt, now)),
      ),
    )
    .orderBy(asc(sql`${knowledgeFacts.embedding} <=> ${JSON.stringify(queryVector)}`))
    .limit(k);

  return rows.map((r) => ({ ...r, score: Number(r.score) }));
}

/** Embeds a visitor question (RETRIEVAL_QUERY) and retrieves matching facts. */
export async function searchFacts(
  db: AppDb,
  siteId: string,
  question: string,
  embedder: Embedder,
  k = 5,
): Promise<RetrievedFact[]> {
  const { vector, model } = await embedder(question, "query");
  return retrieveFacts(db, siteId, vector, { k, model });
}
