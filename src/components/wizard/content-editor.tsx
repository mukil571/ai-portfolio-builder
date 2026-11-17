"use client";

import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { addSectionAction, reorderSectionsAction } from "@/app/dashboard/sites/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { allSectionTypes } from "@/lib/sites/defaults";
import { sectionTitles } from "@/lib/sites/section-titles";
import type { SectionType } from "@/lib/validation/sections";

import { SectionCard } from "./section-card";

type Section = { type: SectionType; content: unknown };

/** Wizard step 3: edit, reorder and add sections. Every change autosaves. */
export function ContentEditor({
  siteId,
  sections,
  uploadsEnabled,
}: {
  siteId: string;
  sections: Section[];
  uploadsEnabled: boolean;
}) {
  const [order, setOrder] = useState(sections.map((s) => s.type));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = useRef(new Set<SectionType>());
  const content = new Map(sections.map((s) => [s.type, s.content]));
  const missing = allSectionTypes.filter((t) => !order.includes(t));

  // Warn before leaving with an unsaved edit (autosave is debounced).
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function move(index: number, d: -1 | 1) {
    const next = [...order];
    [next[index], next[index + d]] = [next[index + d]!, next[index]!];
    setOrder(next);
    startTransition(async () => {
      const result = await reorderSectionsAction({ siteId, order: next });
      if (!result.ok) {
        setOrder(order);
        setError("Couldn't save the new order. Please try again.");
      }
    });
  }

  function add(type: SectionType) {
    startTransition(async () => {
      const result = await addSectionAction({ siteId, type });
      if (result.ok) setOrder((current) => [...current, type]);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
        <p>Fill in what you have. Empty sections are left off your site automatically.</p>
        <Link
          href={`/preview/${siteId}`}
          target="_blank"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Eye aria-hidden="true" /> Preview
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {order.map((type, i) => (
          <SectionCard
            key={type}
            siteId={siteId}
            type={type}
            initial={(content.get(type) as Record<string, unknown>) ?? {}}
            uploadsEnabled={uploadsEnabled}
            isFirst={i === 0}
            isLast={i === order.length - 1}
            onMove={(d) => move(i, d)}
            defaultOpen={i < 2}
            onDirtyChange={(t, isDirty) => {
              if (isDirty) dirty.current.add(t);
              else dirty.current.delete(t);
            }}
          />
        ))}
      </div>

      {missing.length ? (
        <div>
          <p className="mb-2 text-sm font-medium">Add a section</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => add(type)}
              >
                <Plus aria-hidden="true" /> {sectionTitles[type]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-white/5 pt-6">
        <Link
          href={`/dashboard/sites/${siteId}/setup/knowledge`}
          className={buttonVariants({ size: "lg", className: "h-10 px-5" })}
        >
          Continue
        </Link>
      </div>
    </div>
  );
}
