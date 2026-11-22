import { and, lt, sql } from "drizzle-orm";

import { rateLimits } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

/** Limits for sensitive actions: `limit` hits per `windowSeconds`. */
export const limits = {
  /** "Email me when answered" (public). */
  notify: { limit: 5, windowSeconds: 10 * 60 },
  /** Page-view counter (public); generous, it only stops floods. */
  visit: { limit: 120, windowSeconds: 60 },
  /** Image upload tokens (owner). */
  upload: { limit: 30, windowSeconds: 10 * 60 },
  /** Actions that call Loriyum's AI for the owner: fact extraction, answer drafts. */
  aiTool: { limit: 30, windowSeconds: 60 * 60 },
  /** Testing / saving an own API key (calls the provider). */
  keyTest: { limit: 10, windowSeconds: 10 * 60 },
  /** Data export (builds a big file). */
  export: { limit: 5, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof limits;

/**
 * Counts one hit for `who` on `name` and says whether it's within the limit. Fixed
 * windows aligned to the window size; one atomic upsert, so it holds across servers.
 * Fails OPEN on database errors (logged): rate limiting must never take the app down.
 */
export async function hitRateLimit(
  db: AppDb,
  name: LimitName,
  who: string,
  now: Date = new Date(),
): Promise<boolean> {
  const { limit, windowSeconds } = limits[name];
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ key: `${name}:${who}`, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });
    // Occasionally drop windows older than a day so the table stays small.
    if (Math.random() < 0.01) {
      await db
        .delete(rateLimits)
        .where(and(lt(rateLimits.windowStart, new Date(now.getTime() - 24 * 60 * 60 * 1000))));
    }
    return (row?.count ?? 1) <= limit;
  } catch (error) {
    console.error("[rate-limit] check failed", { name, error: (error as Error)?.name });
    return true;
  }
}

export const RATE_LIMITED_MESSAGE =
  "You're doing that a lot. Please wait a few minutes and try again.";
