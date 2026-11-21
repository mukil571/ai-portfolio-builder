"use server";

import { platformSuggestDeps, SuggestUnavailableError } from "@/lib/ai/suggest-live";
import { suggestAnswer } from "@/lib/ai/suggest";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ownerDisplayName } from "@/lib/db/queries/chat";
import {
  answerQuestion,
  deleteQuestion,
  getOwnedQuestion,
  mergeQuestions,
  setQuestionNotify,
  setQuestionStatus,
} from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { emailAnswerToVisitors } from "@/lib/inbox/notify";
import { embed } from "@/lib/knowledge/embeddings";
import { indexFact } from "@/lib/knowledge/indexing";
import {
  answerQuestionSchema,
  mergeQuestionSchema,
  questionIdSchema,
  questionNotifySchema,
  setQuestionStatusSchema,
} from "@/lib/validation/inbox";

/*
 * Questions Inbox server actions. Each: Zod-validates input, takes the owner from the
 * session and calls owner-scoped queries (a question on someone else's site is "not found").
 */

export type InboxResult = { ok: true; message?: string } | { ok: false; error: string };

const GENERIC = "Something went wrong. Please try again.";
const NOT_FOUND = "We couldn't find that question.";
const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? GENERIC;

export async function answerQuestionAction(input: unknown): Promise<InboxResult> {
  const user = await requireUser();
  const parsed = answerQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { questionId, ...answer } = parsed.data;
  const db = getDb();

  const answered = await answerQuestion(db, user.id, questionId, answer);
  if (!answered) return { ok: false, error: "That question was already answered or removed." };

  const notes: string[] = [];
  if (!(await indexFact(db, answered.factId, embed))) {
    notes.push(
      "Saved, but the assistant can't search it yet. Use “Retry indexing” in the Knowledge Base.",
    );
  } else if (answer.visibility === "public") {
    notes.push("Saved. Your assistant will now answer this for every visitor.");
  } else {
    notes.push("Saved as a private fact (the assistant won't share it).");
  }
  const { sent, failed } = await emailAnswerToVisitors(db, answered, answer.answer);
  if (sent) notes.push(`Emailed ${sent} visitor${sent === 1 ? "" : "s"} who asked.`);
  if (failed) notes.push(`${failed} email${failed === 1 ? "" : "s"} couldn't be sent.`);
  return { ok: true, message: notes.join(" ") };
}

export type SuggestionResult =
  | { ok: true; answer: string; basedOn: { id: string; question: string }[] }
  | { ok: false; error: string };

export async function suggestAnswerAction(input: unknown): Promise<SuggestionResult> {
  const user = await requireUser();
  const parsed = questionIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const db = getDb();
  const question = await getOwnedQuestion(db, user.id, parsed.data.questionId);
  if (!question) return { ok: false, error: NOT_FOUND };
  const site = await getEditableSite(db, user.id, question.siteId);
  if (!site) return { ok: false, error: NOT_FOUND };
  try {
    const result = await suggestAnswer(
      db,
      {
        siteId: site.id,
        owner: await ownerDisplayName(db, site.id, site.name),
        question: question.question,
      },
      platformSuggestDeps(),
    );
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof SuggestUnavailableError) {
      return { ok: false, error: "AI suggestions aren't available right now. Write your answer." };
    }
    console.error("[inbox] suggestion failed", { error: (error as Error)?.message });
    return { ok: false, error: "We couldn't draft a suggestion. Write your answer instead." };
  }
}

export async function setQuestionStatusAction(input: unknown): Promise<InboxResult> {
  const user = await requireUser();
  const parsed = setQuestionStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ok = await setQuestionStatus(getDb(), user.id, parsed.data.questionId, parsed.data.status);
  return ok ? { ok: true } : { ok: false, error: NOT_FOUND };
}

export async function deleteQuestionAction(input: unknown): Promise<InboxResult> {
  const user = await requireUser();
  const parsed = questionIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ok = await deleteQuestion(getDb(), user.id, parsed.data.questionId);
  return ok ? { ok: true } : { ok: false, error: NOT_FOUND };
}

export async function mergeQuestionAction(input: unknown): Promise<InboxResult> {
  const user = await requireUser();
  const parsed = mergeQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ok = await mergeQuestions(getDb(), user.id, parsed.data.sourceId, parsed.data.targetId);
  return ok
    ? { ok: true, message: "Merged. Answering it will answer both." }
    : { ok: false, error: "Only open questions on the same site can be merged." };
}

export async function setQuestionNotifyAction(input: unknown): Promise<InboxResult> {
  const user = await requireUser();
  const parsed = questionNotifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ok = await setQuestionNotify(getDb(), user.id, parsed.data.siteId, parsed.data.value);
  return ok ? { ok: true } : { ok: false, error: "We couldn't find that site." };
}
