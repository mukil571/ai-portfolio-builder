import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { chatConfig } from "@/lib/ai/chat-config";
import { unansweredQuestions } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import type { Embedder } from "./indexing";
import { cosineSimilarity } from "./similarity";

/**
 * Logs a question the bot couldn't answer. Semantic dedup: if an OPEN question on the
 * same site (same embedding model) is similar enough, its askedCount goes up instead of
 * creating a new row. Returns the question id. If embedding fails, a row without an
 * embedding is still created so the owner never misses a question.
 */
export async function recordUnansweredQuestion(
  db: AppDb,
  siteId: string,
  question: string,
  embedder: Embedder,
): Promise<string> {
  let vector: number[] | null = null;
  let model: string | null = null;
  try {
    ({ vector, model } = await embedder(question, "question"));
  } catch (error) {
    console.error("[chat] question embedding failed", (error as Error)?.message);
  }

  if (vector && model) {
    const score = cosineSimilarity(unansweredQuestions.embedding, vector);
    const [closest] = await db
      .select({ id: unansweredQuestions.id, score })
      .from(unansweredQuestions)
      .where(
        and(
          eq(unansweredQuestions.siteId, siteId),
          eq(unansweredQuestions.status, "open"),
          isNull(unansweredQuestions.mergedIntoId),
          eq(unansweredQuestions.embeddingModel, model),
        ),
      )
      .orderBy(desc(score))
      .limit(1);

    if (closest && Number(closest.score) >= chatConfig.DEDUP_MIN_SIMILARITY) {
      await db
        .update(unansweredQuestions)
        .set({
          askedCount: sql`${unansweredQuestions.askedCount} + 1`,
          lastAskedAt: new Date(),
        })
        .where(eq(unansweredQuestions.id, closest.id));
      return closest.id;
    }
  }

  const [row] = await db
    .insert(unansweredQuestions)
    .values({ siteId, question, embedding: vector, embeddingModel: model })
    .returning({ id: unansweredQuestions.id });
  return row!.id;
}
