"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Friendly error state for dashboard pages (details stay in server logs). */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-card/50 p-6 text-center"
    >
      <h1 className="text-lg font-semibold tracking-tight">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong on our side. Your sites and data are safe. Try again in a moment.
      </p>
      <Button className="mt-5" onClick={reset}>
        <RotateCcw aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}
