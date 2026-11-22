import { z } from "zod";

import type { AppDb } from "@/lib/db/types";
import type { Embedder } from "@/lib/knowledge/indexing";
import { searchFacts, type RetrievedFact } from "@/lib/knowledge/retrieval";
import { recordUnansweredQuestion } from "@/lib/knowledge/unanswered";

import { chatConfig } from "./chat-config";
import { genuineQuestion, looksLikeInjection } from "./guard";
import { numbersAreGrounded } from "./number-check";
import { generalAnswerLabel, replyTemplates } from "./templates";

/** Structured output of the classify+draft model call. */
export const draftSchema = z.object({
  intent: z.enum(["owner_fact", "general_tech", "off_topic", "unknown"]),
  answerable: z.boolean(),
  answer: z.string().max(1500),
  usedFactIds: z.array(z.string()).max(10),
});
export type Draft = z.output<typeof draftSchema>;

export type Drafter = (input: {
  owner: string;
  tone?: "friendly" | "professional" | "concise";
  facts: RetrievedFact[];
  message: string;
}) => Promise<Draft>;
export type GeneralAnswerer = (input: { owner: string; message: string }) => Promise<string>;

export type ChatDeps = { embed: Embedder; draft: Drafter; general: GeneralAnswerer };

export type ChatOutcome =
  | { kind: "answer"; text: string; factIds: string[]; intent: "owner_fact"; injection: boolean }
  | { kind: "general"; text: string; label: string; intent: "general_tech"; injection: boolean }
  | { kind: "redirect"; text: string; intent: Draft["intent"]; injection: boolean }
  | {
      kind: "unknown";
      text: string;
      intent: Draft["intent"];
      unansweredQuestionId: string;
      injection: boolean;
    };

/**
 * Requests about the assistant's own instructions are answered with the redirect
 * template without calling any model (nothing to leak, nothing to log).
 */
const PROMPT_PROBE =
  /(system|developer) prompt|your (instructions|prompt|rules|configuration)|(repeat|print|reveal|translate|output|show) (everything|all|the text|it) (above|before)|starting with ['"]?you are/i;

export type ChatInput = {
  siteId: string;
  owner: string;
  allowGeneralAnswers: boolean;
  message: string;
  /** Owner's writing-style choice (default friendly). */
  tone?: "friendly" | "professional" | "concise";
};

/**
 * The Golden Rule pipeline (docs/chat-grounding.md). The MODEL proposes; the CODE
 * decides: an owner-fact answer is only returned when every gate check passes.
 */
export async function runChatPipeline(
  db: AppDb,
  input: ChatInput,
  deps: ChatDeps,
): Promise<ChatOutcome> {
  const { siteId, owner, allowGeneralAnswers, message } = input;
  const injection = looksLikeInjection(message);
  // Injection framing never reaches retrieval or the model; only the genuine question does.
  const question = genuineQuestion(message);

  if (PROMPT_PROBE.test(message)) {
    return {
      kind: "redirect",
      text: replyTemplates.redirect(owner),
      intent: "off_topic",
      injection,
    };
  }

  const facts = await searchFacts(db, siteId, question, deps.embed, chatConfig.RETRIEVE_K);
  const draft = draftSchema.parse(
    await deps.draft({ owner, facts, message: question, tone: input.tone }),
  );

  if (draft.intent === "off_topic") {
    return {
      kind: "redirect",
      text: replyTemplates.redirect(owner),
      intent: draft.intent,
      injection,
    };
  }

  if (draft.intent === "general_tech") {
    if (!allowGeneralAnswers) {
      return {
        kind: "redirect",
        text: replyTemplates.redirect(owner),
        intent: draft.intent,
        injection,
      };
    }
    const text = (await deps.general({ owner, message: question })).trim();
    return {
      kind: "general",
      text,
      label: generalAnswerLabel(owner),
      intent: draft.intent,
      injection,
    };
  }

  // owner_fact / unknown: the grounding gate.
  const retrievedIds = new Set(facts.map((f) => f.id));
  const used = facts.filter((f) => draft.usedFactIds.includes(f.id));
  const topScore = facts[0]?.score ?? 0;
  const grounded =
    draft.intent === "owner_fact" &&
    draft.answerable &&
    draft.answer.trim().length > 0 &&
    topScore >= chatConfig.ANSWER_MIN_SIMILARITY &&
    draft.usedFactIds.length > 0 &&
    draft.usedFactIds.every((id) => retrievedIds.has(id)) &&
    numbersAreGrounded(
      draft.answer,
      used.map((f) => `${f.question} ${f.answer}`),
    );

  if (grounded) {
    return {
      kind: "answer",
      text: draft.answer.trim(),
      factIds: used.map((f) => f.id),
      intent: "owner_fact",
      injection,
    };
  }

  const unansweredQuestionId = await recordUnansweredQuestion(db, siteId, question, deps.embed);
  return {
    kind: "unknown",
    text: replyTemplates.unknown(owner),
    intent: draft.intent,
    unansweredQuestionId,
    injection,
  };
}
