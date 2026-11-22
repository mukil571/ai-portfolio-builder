import { after } from "next/server";

import { getEnv } from "@/env";
import { chatConfig } from "@/lib/ai/chat-config";
import { chooseChatModel } from "@/lib/ai/chat-model";
import { cleanMessage } from "@/lib/ai/guard";
import { chatDepsForModel } from "@/lib/ai/models-live";
import { runChatPipeline, type ChatOutcome } from "@/lib/ai/pipeline";
import { languageModel } from "@/lib/ai/providers";
import { replyTemplates } from "@/lib/ai/templates";
import { getIpHash, getUserAgent, getVisitorId } from "@/lib/chat/visitor";
import { parseEncryptionSecret } from "@/lib/crypto/api-keys";
import { getDb } from "@/lib/db";
import { getChatAiConfig, getChatTone } from "@/lib/db/queries/ai-settings";
import {
  countRecentByIp,
  countRecentBySite,
  getChatSite,
  getOrCreateConversation,
  saveExchange,
} from "@/lib/db/queries/chat";
import { knowledgeFacts } from "@/lib/db/schema";
import { alertOwnerOfNewQuestion } from "@/lib/inbox/notify";
import { getPlanStatus, recordChatUsage } from "@/lib/plans/usage";
import { chatRequestSchema } from "@/lib/validation/chat";

import { and, eq, inArray } from "drizzle-orm";

/** Events streamed to the widget as newline-delimited JSON. */
export type ChatEvent =
  | {
      type: "meta";
      kind: ChatOutcome["kind"] | "not_configured" | "rate_limited" | "quota_exceeded" | "error";
      conversationId?: string;
      unansweredQuestionId?: string;
      label?: string;
      sources?: { id: string; question: string }[];
    }
  | { type: "text"; delta: string }
  | { type: "done" };

function ndjson(events: ChatEvent[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Splits text into word-ish chunks so the widget can render progressively. */
function chunks(text: string): ChatEvent[] {
  return (text.match(/\S+\s*/g) ?? [text]).map((delta) => ({ type: "text", delta }));
}

function templateReply(
  kind: "not_configured" | "rate_limited" | "quota_exceeded" | "error",
  text: string,
  status: number,
) {
  return ndjson([{ type: "meta", kind }, ...chunks(text), { type: "done" }], status);
}

/**
 * Visitor chat. Public, scoped to a PUBLISHED site by slug. The full reply is generated
 * and checked by the grounding gate BEFORE anything is streamed (safety over latency).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const message = cleanMessage(parsed.data.message);
  if (!message) return Response.json({ error: "Message is empty." }, { status: 400 });

  const db = getDb();
  const site = await getChatSite(db, parsed.data.slug);
  if (!site) return Response.json({ error: "Not found." }, { status: 404 });
  if (site.mode === "none")
    return templateReply("not_configured", replyTemplates.notConfigured, 200);

  const ipHash = await getIpHash();
  const now = Date.now();
  const [byIp, bySite] = await Promise.all([
    countRecentByIp(db, ipHash, new Date(now - 60_000)),
    countRecentBySite(db, site.siteId, new Date(now - 3_600_000)),
  ]);
  if (
    byIp >= chatConfig.RATE_LIMIT_PER_IP_PER_MINUTE ||
    bySite >= chatConfig.RATE_LIMIT_PER_SITE_PER_HOUR
  ) {
    return templateReply("rate_limited", replyTemplates.rateLimited, 429);
  }

  // Whose model answers: the owner's own key, or Loriyum's within the plan quota.
  const config = await getChatAiConfig(db, site.siteId);
  if (!config) return Response.json({ error: "Not found." }, { status: 404 });
  const env = getEnv();
  const choice = await chooseChatModel(config, site.siteId, {
    platformKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
    encryptionSecret: () => parseEncryptionSecret(env.API_KEY_ENCRYPTION_KEY),
    planStatus: () => getPlanStatus(db, config.ownerId),
  });
  if (choice.kind === "not_configured") {
    return templateReply("not_configured", replyTemplates.notConfigured, 200);
  }
  if (choice.kind === "quota_exceeded") {
    return templateReply("quota_exceeded", replyTemplates.quotaReached, 200);
  }

  const conversationId = await getOrCreateConversation(db, {
    siteId: site.siteId,
    visitorId: await getVisitorId(),
    ipHash,
    userAgent: await getUserAgent(),
    conversationId: parsed.data.conversationId,
  });

  let outcome: ChatOutcome;
  try {
    outcome = await runChatPipeline(
      db,
      {
        siteId: site.siteId,
        owner: site.owner,
        allowGeneralAnswers: site.allowGeneralAnswers,
        message,
        tone: await getChatTone(db, site.siteId),
      },
      chatDepsForModel(languageModel(choice.provider, choice.model, choice.apiKey)),
    );
  } catch (error) {
    // Provider errors are summarised (name/status only): their messages can echo requests.
    console.error("[chat] pipeline failed", {
      siteId: site.siteId,
      provider: choice.provider,
      error: (error as Error)?.name,
      status: (error as { statusCode?: number })?.statusCode ?? null,
    });
    return templateReply("error", replyTemplates.error, 500);
  }
  if (outcome.injection) console.warn("[chat] possible prompt injection", { siteId: site.siteId });

  const factIds = outcome.kind === "answer" ? outcome.factIds : [];
  const unansweredQuestionId = outcome.kind === "unknown" ? outcome.unansweredQuestionId : null;
  await saveExchange(db, conversationId, message, {
    content: outcome.text,
    intent: outcome.intent,
    factIds,
    unansweredQuestionId,
    provider: outcome.kind === "answer" || outcome.kind === "general" ? choice.provider : null,
    model: outcome.kind === "answer" || outcome.kind === "general" ? choice.model : null,
  });
  // One metered message per visitor message the pipeline handled.
  await recordChatUsage(db, {
    userId: config.ownerId,
    siteId: site.siteId,
    platformBilled: choice.platformBilled,
    provider: choice.provider,
    model: choice.model,
  });

  // Owner email for a NEW question (instant sites); runs after the reply is sent.
  if (unansweredQuestionId) after(() => alertOwnerOfNewQuestion(db, unansweredQuestionId));

  const sources = factIds.length
    ? await db
        .select({ id: knowledgeFacts.id, question: knowledgeFacts.question })
        .from(knowledgeFacts)
        .where(and(inArray(knowledgeFacts.id, factIds), eq(knowledgeFacts.siteId, site.siteId)))
    : [];

  return ndjson([
    {
      type: "meta",
      kind: outcome.kind,
      conversationId,
      unansweredQuestionId: unansweredQuestionId ?? undefined,
      label: outcome.kind === "general" ? outcome.label : undefined,
      sources: sources.length ? sources : undefined,
    },
    ...chunks(outcome.text),
    { type: "done" },
  ]);
}
