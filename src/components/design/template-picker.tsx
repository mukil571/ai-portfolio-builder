"use client";

import { Check, ExternalLink } from "lucide-react";

import { templates, type TemplateMeta } from "@/lib/sites/templates";
import type { TemplateId } from "@/lib/validation/site-theme";

/** Small drawing of a template's palette and accent (no iframe, so the page stays light). */
export function TemplateSwatch({ meta, accent }: { meta: TemplateMeta; accent?: string }) {
  const { bg, fg, card } = meta.swatch;
  const a = accent || meta.accent;
  return (
    <div
      aria-hidden="true"
      className="h-24 overflow-hidden rounded-lg p-3"
      style={{ background: bg }}
    >
      <div className="h-2.5 w-1/2 rounded-full" style={{ background: fg }} />
      <div className="mt-1.5 h-1.5 w-1/3 rounded-full opacity-50" style={{ background: fg }} />
      <div className="mt-3 flex gap-2">
        <div
          className="h-8 flex-1 rounded-md"
          style={{ background: card, outline: `1px solid ${fg}1a` }}
        />
        <div
          className="h-8 flex-1 rounded-md"
          style={{ background: card, outline: `1px solid ${fg}1a` }}
        />
      </div>
      <div className="mt-2 h-2 w-10 rounded-full" style={{ background: a }} />
    </div>
  );
}

/** Radio grid of all templates, the site's own kind first. */
export function TemplatePicker({
  value,
  kind,
  accent,
  onChange,
}: {
  value: TemplateId;
  kind: "portfolio" | "business";
  accent: string;
  onChange: (id: TemplateId) => void;
}) {
  const groups = (["portfolio", "business"] as const)
    .slice()
    .sort((a) => (a === kind ? -1 : 1))
    .map((k) => ({ kind: k, items: templates.filter((t) => t.kind === k) }));

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <fieldset key={g.kind}>
          <legend className="mb-2 text-sm font-medium text-muted-foreground">
            {g.kind === "portfolio" ? "Portfolio templates" : "Business templates"}
          </legend>
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {g.items.map((t) => {
              const selected = value === t.id;
              return (
                <div key={t.id} className="relative">
                  <label
                    className={`block cursor-pointer rounded-xl border p-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={selected}
                      onChange={() => onChange(t.id)}
                      className="sr-only"
                    />
                    <TemplateSwatch meta={t} accent={selected ? accent : undefined} />
                    <span className="mt-2 flex items-center gap-1 text-sm font-medium">
                      {t.name}
                      {selected ? (
                        <Check className="size-3.5 text-primary" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="block text-xs leading-snug text-muted-foreground">
                      {t.description}
                    </span>
                  </label>
                  <a
                    href={`/templates/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Sample <ExternalLink className="size-3" aria-hidden="true" />
                    <span className="sr-only">of {t.name} (opens in a new tab)</span>
                  </a>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
