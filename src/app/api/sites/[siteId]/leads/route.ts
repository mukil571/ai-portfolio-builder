import { connection } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { listLeads } from "@/lib/db/queries/workspace";
import { isUuid } from "@/lib/sites/slug";

/** Visitor emails for one of the owner's sites, as a CSV download. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  await connection();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { siteId } = await params;
  if (!isUuid(siteId)) return Response.json({ error: "Not found." }, { status: 404 });
  const rows = await listLeads(getDb(), user.id, siteId);
  if (!rows) return Response.json({ error: "Not found." }, { status: 404 });

  const csv = toCsv([
    ["email", "reason", "question", "answered_email_sent", "date"],
    ...rows.map((r) => [
      r.email,
      r.purpose === "notify_answer" ? "wants answer" : "contact",
      r.question,
      r.notifiedAt ? r.notifiedAt.toISOString() : "",
      r.createdAt.toISOString(),
    ]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitor-emails-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
