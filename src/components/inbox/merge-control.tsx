"use client";

import { Merge } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

/** "Merge": folds a duplicate question into another open one. */
export function MergeControl({
  question,
  targets,
  disabled,
  onMerge,
}: {
  question: { id: string; question: string };
  targets: { id: string; question: string }[];
  disabled: boolean;
  onMerge: (targetId: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  if (!targets.length) return null;

  if (!open) {
    return (
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        <Merge aria-hidden="true" /> Merge
      </Button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <label htmlFor={id} className="sr-only">
        Merge “{question.question}” into
      </label>
      <select
        id={id}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-64"
      >
        <option value="">Merge into…</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.question.length > 60 ? `${t.question.slice(0, 57)}…` : t.question}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={disabled || !target} onClick={() => onMerge(target)}>
        Merge
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
