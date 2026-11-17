import "server-only";

import { createGoogleGenerativeAI, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embed as aiEmbed } from "ai";

import { getEnv } from "@/env";

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_TASK_TYPE,
  type EmbeddingPurpose,
} from "./embedding-config";
import { l2Normalize } from "./vector-math";

export type Embedding = { vector: number[]; model: string };

export class EmbeddingUnavailableError extends Error {
  constructor() {
    super("Embeddings are not configured (GOOGLE_GENERATIVE_AI_API_KEY is missing).");
    this.name = "EmbeddingUnavailableError";
  }
}

/**
 * Embeds `text` with the fixed platform model at 768 dimensions.
 *
 * - `outputDimensionality: 768` truncates Gemini's 3072-dim output (Matryoshka); the
 *   result is L2-normalized here because truncated Gemini vectors are not unit-length.
 * - `taskType` comes from the purpose, so facts, queries and inbox questions are each
 *   embedded consistently (see EMBEDDING_TASK_TYPE).
 */
export async function embed(text: string, purpose: EmbeddingPurpose): Promise<Embedding> {
  const apiKey = getEnv().GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new EmbeddingUnavailableError();

  const google = createGoogleGenerativeAI({ apiKey });
  const options: GoogleEmbeddingModelOptions = {
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType: EMBEDDING_TASK_TYPE[purpose],
  };

  const { embedding } = await aiEmbed({
    model: google.embeddingModel(EMBEDDING_MODEL),
    value: text,
    providerOptions: { google: options },
  });

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding has ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }
  return { vector: l2Normalize(embedding), model: EMBEDDING_MODEL };
}
