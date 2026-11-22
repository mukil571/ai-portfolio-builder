"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { changePlanAction } from "@/app/dashboard/sites/ai-actions";
import { Button } from "@/components/ui/button";
import { planIds, plans, type PlanId } from "@/lib/plans/plans";
import { cn } from "cn";

/** Plan cards with a simulated switch (no payment). */
export function PlanPicker({ current }: { current: PlanId }) {
  const router = useRouter();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [, start] = useTransition();

  function choose(plan: PlanId) {
    setBusy(plan);
    setNotice(null);
    start(async () => {
      const r = await changePlanAction({ plan });
      setBusy(null);
      setNotice(
        r.ok
          ? { tone: "ok", text: r.message ?? "Plan changed." }
          : { tone: "error", text: r.error },
      );
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300"
          }
        >
          {notice.text}
        </p>
      ) : null}
      <ul className="grid gap-4 md:grid-cols-3">
        {planIds.map((id) => {
          const p = plans[id];
          const isCurrent = id === current;
          return (
            <li
              key={id}
              className={cn(
                "flex flex-col rounded-2xl border p-5",
                isCurrent ? "border-primary bg-primary/10" : "border-white/10 bg-card/50",
              )}
            >
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {p.monthlyMessages.toLocaleString("en")} Loriyum-AI messages / month
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Unlimited with your own AI key
                </li>
              </ul>
              <div className="mt-auto pt-5">
                {isCurrent ? (
                  <p className="text-sm font-medium text-primary">Your current plan</p>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={() => choose(id)}
                  >
                    {busy === id ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                    Switch to {p.name}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
