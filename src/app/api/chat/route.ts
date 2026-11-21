import { chatConfig } from "@/lib/ai/chat-config";
import { cleanMessage } from "@/lib/ai/guard";
import { ChatUnavailableError, platformChatDeps } from "@/lib/ai/models-live";
import { runChatPipeline, type ChatOutcome } from "@/lib/ai/pipeline";
import { replyTemplates } from "@/lib/ai/templates";
import { getIpHash, getUserAgent, getVisitorId } from "@/lib/chat/visitor";
import { getDb } from "@/lib/db";
import {
  countRecentByIp,
  countRecentBySite,
  getChatSite,
  getOrCreateConversation,
  saveExchange,
} from "@/lib/db/queries/chat";
import { knowledgeFacts } from "@/lib/db/schema";
import { chatRequestSchema } from "@/lib/validation/chat";

import { and, eq, inArray } from "drizzle-orm";

/** Events streamed to the widget as newline-delimited JSON. */
export type ChatEvent =
  | {
      type: "meta";
      kind: ChatOutcome["kind"] | "not_configured" | "rate_limited" | "error";
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
  kind: "not_configured" | "rate_limited" | "error",
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
      },
      platformChatDeps(),
    );
  } catch (error) {
    if (error instanceof ChatUnavailableError) {
      return templateReply("not_configured", replyTemplates.notConfigured, 200);
    }
    console.error("[chat] pipeline failed", {
      siteId: site.siteId,
      error: (error as Error)?.message,
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
    provider: outcome.kind === "answer" || outcome.kind === "general" ? "google" : null,
    model:
      outcome.kind === "answer" || outcome.kind === "general"
        ? chatConfig.PLATFORM_CHAT_MODEL
        : null,
  });

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
