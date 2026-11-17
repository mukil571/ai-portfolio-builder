/**
 * The ONE platform embedding model used for every site, regardless of the owner's
 * chat provider (see CLAUDE.md §3). Changing the model or dimension requires a
 * migration and re-embedding every fact and question.
 */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Gemini task type per use. Facts are documents; visitor questions are retrieval
 * queries against them; unanswered questions are compared to each other for dedup.
 * Every row in a given column must use the same purpose so vectors stay comparable.
 */
export const EMBEDDING_TASK_TYPE = {
  /** knowledge_facts.embedding */
  fact: "RETRIEVAL_DOCUMENT",
  /** Visitor question when searching knowledge_facts (never stored). */
  query: "RETRIEVAL_QUERY",
  /** unanswered_questions.embedding (question-to-question dedup). */
  question: "SEMANTIC_SIMILARITY",
} as const;

export type EmbeddingPurpose = keyof typeof EMBEDDING_TASK_TYPE;
