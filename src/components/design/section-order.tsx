"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";

import { reorderSectionsAction } from "@/app/dashboard/sites/actions";
import { Button } from "@/components/ui/button";
import { sectionTitles } from "@/lib/sites/section-titles";
import type { SectionType } from "@/lib/validation/sections";

/** Reorders sections; each move saves right away. */
export function SectionOrder({
  siteId,
  initial,
  onSaved,
}: {
  siteId: string;
  initial: SectionType[];
  onSaved: () => void;
}) {
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function move(i: number, d: -1 | 1) {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    const previous = order;
    setOrder(next);
    setError(null);
    start(async () => {
      const r = await reorderSectionsAction({ siteId, order: next });
      if (r.ok) onSaved();
      else {
        setOrder(previous);
        setError("Couldn't save the new order. Please try again.");
      }
    });
  }

  return (
    <div>
      <ol className="divide-y divide-white/5 rounded-xl border border-white/10">
        {order.map((type, i) => (
          <li key={type} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
            <span>
              <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>
              {sectionTitles[type]}
            </span>
            <span className="flex gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pending || i === 0}
                aria-label={`Move ${sectionTitles[type]} up`}
                onClick={() => move(i, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pending || i === order.length - 1}
                aria-label={`Move ${sectionTitles[type]} down`}
                onClick={() => move(i, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        Saved as you go. Empty sections stay hidden on your site.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
