"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Friendly error state for every site workspace tab (details stay in server logs). */
export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-card/50 p-6 text-center"
    >
      <h1 className="text-lg font-semibold tracking-tight">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong on our side. Your site and data are safe. Try again in a moment.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw aria-hidden="true" /> Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-3 text-sm underline underline-offset-4"
        >
          My Websites
        </Link>
      </div>
    </div>
  );
}
