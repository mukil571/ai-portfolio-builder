/**
 * Fixed replies (not model-written) for every non-answer path, so they can never leak
 * the system prompt or invent an owner fact. See docs/chat-grounding.md §1.5.
 */
export const replyTemplates = {
  unknown: (owner: string) =>
    `I don't have that from ${owner} yet. I've passed your question on — want an email when they answer?`,
  redirect: (owner: string) => `I can only help with questions about ${owner} and their work.`,
  notConfigured: "The assistant isn't set up on this site yet.",
  rateLimited: "You're sending messages a little fast. Please wait a moment and try again.",
  quotaReached:
    "This assistant has answered all the questions it can this month. Please use the contact details on this page to reach the owner directly.",
  error: "Sorry, something went wrong. Please try again in a moment.",
};

/** Label shown on general-knowledge answers (only when the owner allows them). */
export const generalAnswerLabel = (owner: string) => `General info — not from ${owner}`;
