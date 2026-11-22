import type { Metadata } from "next";
import { Suspense } from "react";

import { UsageMeter } from "@/components/ai/usage-meter";
import { PlanPicker } from "@/components/ai/plan-picker";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getPlanStatus } from "@/lib/plans/usage";

export const metadata: Metadata = { title: "Plan & usage · Loriyum" };

/** The owner's (simulated) plan and this month's Loriyum-AI usage across all sites. */
export default function PlanPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; usage</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Plans only cover chats answered by Loriyum&apos;s AI. Sites using your own AI key are
        unlimited and never count here.
      </p>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-white/5" />}>
        <Plan />
      </Suspense>
    </div>
  );
}

async function Plan() {
  const user = await requireUser("/dashboard/plan");
  const status = await getPlanStatus(getDb(), user.id);
  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
        <h2 className="mb-4 font-semibold tracking-tight">This month</h2>
        <UsageMeter
          used={status.used}
          limit={status.limit}
          resetsOn={status.periodEnd.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        />
      </section>
      <PlanPicker current={status.plan} />
      <p className="text-xs text-muted-foreground">
        Payments aren&apos;t connected yet: switching plans is simulated and free.
      </p>
    </div>
  );
}
