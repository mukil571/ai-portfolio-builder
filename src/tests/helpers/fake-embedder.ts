import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/knowledge/embedding-config";
import type { Embedder } from "@/lib/knowledge/indexing";
import { l2Normalize } from "@/lib/knowledge/vector-math";

/** Deterministic test embedder: hashed bag-of-words, so shared words => similar vectors. */
export function fakeVector(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const words = text
    .toLowerCase()
    .replace(/^(q|a):\s*/gm, "")
    .match(/[a-z0-9]+/g) ?? ["empty"];
  for (const word of words) {
    let h = 2166136261;
    for (const ch of word) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    v[Math.abs(h) % EMBEDDING_DIMENSIONS]! += 1;
  }
  return l2Normalize(v);
}

export const fakeEmbedder: Embedder = async (text) => ({
  vector: fakeVector(text),
  model: EMBEDDING_MODEL,
});

export const failingEmbedder: Embedder = async () => {
  throw new Error("embedding service unavailable");
};
