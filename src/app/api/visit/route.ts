import { z } from "zod";

import { getDb } from "@/lib/db";
import { getIpHash } from "@/lib/chat/visitor";
import { recordVisit } from "@/lib/db/queries/workspace";
import { hitRateLimit } from "@/lib/security/rate-limit";
import { isValidSlug } from "@/lib/sites/slug";

const schema = z.object({ slug: z.string().max(60) });

/** Obvious crawlers and previewers; they aren't visitors. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget/i;

/** Public, cookieless page-view counter for published sites. Always answers 204. */
export async function POST(request: Request): Promise<Response> {
  const done = new Response(null, { status: 204 });
  if (BOT.test(request.headers.get("user-agent") ?? "")) return done;
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done;
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidSlug(parsed.data.slug)) return done;
  try {
    const db = getDb();
    if (!(await hitRateLimit(db, "visit", await getIpHash()))) return done;
    await recordVisit(db, parsed.data.slug);
  } catch (error) {
    console.error("[visit] count failed", (error as Error)?.name);
  }
  return done;
}
