"use client";

import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { saveSectionAction } from "@/app/dashboard/sites/actions";
import { Button } from "@/components/ui/button";
import { sectionForms } from "@/lib/sites/section-fields";
import { isSectionEmpty, parseSection, type SectionType } from "@/lib/validation/sections";

import { FieldsEditor } from "./field-editor";

type SaveState = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 800;

/** One section in the content step: collapsible form with debounced autosave. */
export function SectionCard({
  siteId,
  type,
  initial,
  uploadsEnabled,
  isFirst,
  isLast,
  onMove,
  onDirtyChange,
  defaultOpen,
}: {
  siteId: string;
  type: SectionType;
  initial: Record<string, unknown>;
  uploadsEnabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (d: -1 | 1) => void;
  onDirtyChange: (type: SectionType, dirty: boolean) => void;
  defaultOpen: boolean;
}) {
  const form = sectionForms[type];
  const [values, setValues] = useState(initial);
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(values);

  const parsed = parseSection(type, values);
  const shown = parsed !== null && !isSectionEmpty(parsed);

  async function save(content: Record<string, unknown>) {
    setState("saving");
    const result = await saveSectionAction({ siteId, type, content });
    if (latest.current !== content) return; // a newer edit is pending; its save reports
    if (result.ok) {
      setState("saved");
      setError(null);
      onDirtyChange(type, false);
    } else {
      setState("error");
      setError(result.error);
    }
  }

  function change(next: Record<string, unknown>) {
    setValues(next);
    latest.current = next;
    onDirtyChange(type, true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), AUTOSAVE_MS);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const panelId = `section-${type}-panel`;
  return (
    <section aria-labelledby={`section-${type}-title`} className="rounded-2xl glass">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}
            aria-hidden="true"
          />
          <span id={`section-${type}-title`} className="min-w-0 truncate font-medium">
            {form.title}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
              shown ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-muted-foreground"
            }`}
          >
            {shown ? "Shown" : "Hidden"}
            <span className="sr-only">
              {shown ? " on your site" : " (empty sections are left off your site)"}
            </span>
          </span>
        </button>
        <SaveStatus state={state} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${form.title} up`}
          disabled={isFirst}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${form.title} down`}
          disabled={isLast}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
      </div>
      {open ? (
        <div id={panelId} className="border-t border-white/5 p-4 sm:p-5">
          <p className="mb-4 text-sm text-muted-foreground">{form.description}</p>
          <FieldsEditor
            fields={form.fields}
            values={values}
            onChange={change}
            ctx={{ siteId, uploadsEnabled }}
          />
          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}{" "}
              <button type="button" className="underline" onClick={() => void save(latest.current)}>
                Retry
              </button>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground sm:min-w-16"
    >
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Saving…
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3" aria-hidden="true" /> Saved
        </>
      ) : state === "error" ? (
        <>
          <AlertCircle className="size-3 text-destructive" aria-hidden="true" /> Not saved
        </>
      ) : null}
    </span>
  );
}
