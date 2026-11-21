/** Tunable chat numbers (see docs/chat-grounding.md §4). Tune only with the eval set. */
export const chatConfig = {
  /** Minimum best-fact cosine score to allow an owner-fact answer. */
  ANSWER_MIN_SIMILARITY: 0.55,
  /** Minimum score to count a new unknown question as a repeat of an open one. */
  DEDUP_MIN_SIMILARITY: 0.88,
  /** Facts passed to the answer model. */
  RETRIEVE_K: 5,
  /** Visitor message cap (characters). */
  MAX_MESSAGE_CHARS: 1000,
  /** Abuse protection. */
  RATE_LIMIT_PER_IP_PER_MINUTE: 20,
  RATE_LIMIT_PER_SITE_PER_HOUR: 300,
  /** Platform chat model (owners' own providers arrive in Phase 8). */
  PLATFORM_CHAT_MODEL: "gemini-3.5-flash-lite",
} as const;
