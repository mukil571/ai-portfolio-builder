import { and, count, eq, gte } from "drizzle-orm";

import { subscriptions, usageLogs } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import { PERIOD_DAYS, plans, type PlanId } from "./plans";

const DAY = 24 * 60 * 60 * 1000;

export type PlanStatus = {
  plan: PlanId;
  periodStart: Date;
  periodEnd: Date;
  used: number;
  limit: number;
};

/**
 * The owner's plan and this period's Loriyum-AI message count. Creates a Free row if the
 * user has none and rolls an expired period forward (whole 30-day steps), so quotas reset.
 */
export async function getPlanStatus(
  db: AppDb,
  userId: string,
  now: Date = new Date(),
): Promise<PlanStatus> {
  let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  if (!sub) {
    await db
      .insert(subscriptions)
      .values({
        userId,
        plan: "free",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + PERIOD_DAYS * DAY),
      })
      .onConflictDoNothing({ target: subscriptions.userId });
    [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  }
  let start = sub!.currentPeriodStart;
  let end = sub!.currentPeriodEnd;
  if (now >= end) {
    const steps = Math.floor((now.getTime() - end.getTime()) / (PERIOD_DAYS * DAY)) + 1;
    start = new Date(end.getTime() + (steps - 1) * PERIOD_DAYS * DAY);
    end = new Date(start.getTime() + PERIOD_DAYS * DAY);
    await db
      .update(subscriptions)
      .set({ currentPeriodStart: start, currentPeriodEnd: end })
      .where(eq(subscriptions.userId, userId));
  }
  const [row] = await db
    .select({ n: count() })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.kind, "chat_message"),
        eq(usageLogs.platformBilled, true),
        gte(usageLogs.createdAt, start),
      ),
    );
  const plan = sub!.plan;
  return {
    plan,
    periodStart: start,
    periodEnd: end,
    used: Number(row?.n ?? 0),
    limit: plans[plan].monthlyMessages,
  };
}

/** Meters one answered visitor message. Only platform-billed ones count toward quota. */
export async function recordChatUsage(
  db: AppDb,
  entry: {
    userId: string;
    siteId: string;
    platformBilled: boolean;
    provider: string;
    model: string;
  },
): Promise<void> {
  await db.insert(usageLogs).values({ ...entry, kind: "chat_message" });
}

/**
 * Simulated upgrade/downgrade: switches the plan immediately. The billing period (and its
 * usage so far) is kept, so switching plans can't be used to reset the counter.
 */
export async function changePlan(db: AppDb, userId: string, plan: PlanId): Promise<void> {
  await getPlanStatus(db, userId); // ensures the row exists
  await db
    .update(subscriptions)
    .set({ plan, status: "active" })
    .where(eq(subscriptions.userId, userId));
}
