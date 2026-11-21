import { getDb } from "@/lib/db";
import { createNotifyLead, getChatSite } from "@/lib/db/queries/chat";
import { notifyRequestSchema } from "@/lib/validation/chat";

/**
 * "Email me when answered". Public, scoped to a published site; the question must belong
 * to that site. The email is stored as a lead and used only to notify about this answer.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = notifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const db = getDb();
  const site = await getChatSite(db, parsed.data.slug);
  if (!site) return Response.json({ error: "Not found." }, { status: 404 });

  const ok = await createNotifyLead(db, {
    siteId: site.siteId,
    unansweredQuestionId: parsed.data.unansweredQuestionId,
    email: parsed.data.email,
    conversationId: parsed.data.conversationId ?? null,
  });
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
