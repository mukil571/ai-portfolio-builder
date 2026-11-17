import "server-only";

import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

const PERIOD_DAYS = 30;

/** Creates the user's Free plan row; a no-op if they already have one. */
export async function createFreeSubscription(userId: string): Promise<void> {
  const now = new Date();
  await getDb()
    .insert(subscriptions)
    .values({
      userId,
      plan: "free",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing({ target: subscriptions.userId });
}
