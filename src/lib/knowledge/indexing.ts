import { eq } from "drizzle-orm";

import { knowledgeFacts } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import type { EmbeddingPurpose } from "./embedding-config";

/** Embedding function (real: lib/knowledge/embeddings.ts `embed`; tests: a fake). */
export type Embedder = (
  text: string,
  purpose: EmbeddingPurpose,
) => Promise<{ vector: number[]; model: string }>;

/** The text embedded for a fact: question and answer together. */
export function factEmbeddingText(question: string, answer: string): string {
  return `Q: ${question}\nA: ${answer}`;
}

/**
 * Embeds an APPROVED fact and stores the vector. Returns false (fact stays
 * unsearchable, owner can retry) if the fact isn't approved or embedding fails.
 */
export async function indexFact(db: AppDb, factId: string, embedder: Embedder): Promise<boolean> {
  const [fact] = await db
    .select({
      question: knowledgeFacts.question,
      answer: knowledgeFacts.answer,
      status: knowledgeFacts.status,
    })
    .from(knowledgeFacts)
    .where(eq(knowledgeFacts.id, factId))
    .limit(1);
  if (!fact || fact.status !== "approved") return false;
  try {
    const { vector, model } = await embedder(factEmbeddingText(fact.question, fact.answer), "fact");
    await db
      .update(knowledgeFacts)
      .set({ embedding: vector, embeddingModel: model })
      .where(eq(knowledgeFacts.id, factId));
    return true;
  } catch (error) {
    // Details to server logs; the UI shows "not searchable yet" with a retry.
    console.error("[knowledge] indexing failed", { factId, error: (error as Error)?.message });
    return false;
  }
}
