import { connection } from "next/server";

import { getEnv } from "@/env";
import { getDb } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/inbox/cron-auth";
import { sendDailyDigests } from "@/lib/inbox/notify";

/**
 * Daily question digest, called by Vercel Cron (vercel.json). Refuses every request
 * unless CRON_SECRET is set and sent as a Bearer token.
 */
export async function GET(request: Request): Promise<Response> {
  await connection();
  if (!isAuthorizedCron(request.headers.get("authorization"), getEnv().CRON_SECRET)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await sendDailyDigests(getDb());
  return Response.json({ ok: true, ...result });
}
