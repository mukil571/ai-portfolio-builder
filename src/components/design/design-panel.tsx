"use client";

import { Check, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { saveSectionAction } from "@/app/dashboard/sites/actions";
import { saveDesignAction } from "@/app/dashboard/sites/design-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageField } from "@/components/wizard/image-field";
import { fontPairs, templateMeta } from "@/lib/sites/templates";
import { fontPairIds, type FontPairId, type TemplateId } from "@/lib/validation/site-theme";
import type { SectionType } from "@/lib/validation/sections";

import { SectionOrder } from "./section-order";
import { TemplatePicker } from "./template-picker";

type Values = {
  template: TemplateId;
  /** "" = template default */
  accent: string;
  fontPair: FontPairId | "";
  defaultMode: "light" | "dark" | "";
  seoTitle: string;
  seoDescription: string;
};

const PRESETS = [
  "#2f6feb",
  "#7c3aed",
  "#e11d48",
  "#f97316",
  "#0f766e",
  "#3fb950",
  "#0891b2",
  "#18181b",
];

const field =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
      <h2 className="font-semibold tracking-tight">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Owner customization. Template/colour/font/mode/SEO save together; image and order save instantly. */
export function DesignPanel({
  siteId,
  kind,
  initial,
  seoDefaults,
  sections,
  hero,
  uploadsEnabled,
}: {
  siteId: string;
  kind: "portfolio" | "business";
  initial: Values;
  seoDefaults: { title: string; description: string };
  sections: SectionType[];
  hero: Record<string, unknown>;
  uploadsEnabled: boolean;
}) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [heroImage, setHeroImage] = useState(
    typeof hero.imageUrl === "string" ? hero.imageUrl : "",
  );
  const [previewKey, setPreviewKey] = useState(0);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const meta = templateMeta(values.template);
  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setStatus(null);
    setValues((prev) => ({ ...prev, [k]: v }));
  };
  const refreshPreview = () => setPreviewKey((k) => k + 1);

  function save() {
    start(async () => {
      const r = await saveDesignAction({ siteId, ...values });
      if (r.ok) {
        setSaved(values);
        setStatus({ tone: "ok", text: "Design saved." });
        refreshPreview();
      } else setStatus({ tone: "error", text: r.error });
    });
  }

  function saveHeroImage(url: string) {
    setHeroImage(url);
    start(async () => {
      const r = await saveSectionAction({
        siteId,
        type: "hero",
        content: { ...hero, imageUrl: url },
      });
      if (r.ok) refreshPreview();
      else setStatus({ tone: "error", text: "Couldn't save the image. Please try again." });
    });
  }

  const effectiveFont = values.fontPair || meta.fontPair;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0 space-y-6">
        <Card
          title="Template"
          hint="Templates change the look, never your content. Switch any time."
        >
          <TemplatePicker
            value={values.template}
            kind={kind}
            accent={values.accent}
            onChange={(t) => set("template", t)}
          />
        </Card>

        <Card
          title="Colours and fonts"
          hint="Leave on “template default” to use each template's own style."
        >
          <div className="space-y-5">
            <div>
              <p id={`${id}-accent`} className="text-sm font-medium">
                Accent colour
              </p>
              <div
                role="group"
                aria-labelledby={`${id}-accent`}
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("accent", c)}
                    aria-label={`Accent ${c}`}
                    aria-pressed={values.accent === c}
                    className="flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: c }}
                  >
                    {values.accent === c ? (
                      <Check
                        className="size-4 text-white mix-blend-difference"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                ))}
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="color"
                    value={values.accent || meta.accent}
                    onChange={(e) => set("accent", e.target.value)}
                    className="size-8 cursor-pointer rounded-full border border-white/15 bg-transparent"
                  />
                  Custom
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!values.accent}
                  onClick={() => set("accent", "")}
                >
                  <RotateCcw aria-hidden="true" /> Template default
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${id}-font`}>Fonts</Label>
                <select
                  id={`${id}-font`}
                  value={values.fontPair}
                  onChange={(e) => set("fontPair", e.target.value as Values["fontPair"])}
                  className={field}
                >
                  <option value="">Template default ({fontPairs[meta.fontPair].label})</option>
                  {fontPairIds.map((f) => (
                    <option key={f} value={f}>
                      {fontPairs[f].label}
                    </option>
                  ))}
                </select>
                <p
                  className="truncate text-lg"
                  style={{ fontFamily: `var(${fontPairs[effectiveFont].headingVar})` }}
                  aria-hidden="true"
                >
                  The quick brown fox
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${id}-mode`}>Visitors first see</Label>
                <select
                  id={`${id}-mode`}
                  value={values.defaultMode}
                  onChange={(e) => set("defaultMode", e.target.value as Values["defaultMode"])}
                  className={field}
                >
                  <option value="">Template default ({meta.mode})</option>
                  <option value="light">Light mode</option>
                  <option value="dark">Dark mode</option>
                </select>
                <p className="text-xs text-muted-foreground">Visitors can still switch.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Search and sharing"
          hint="How your site appears on Google and in link previews."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}-title`}>Page title</Label>
              <Input
                id={`${id}-title`}
                value={values.seoTitle}
                maxLength={70}
                placeholder={seoDefaults.title}
                onChange={(e) => set("seoTitle", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-desc`}>Description</Label>
              <textarea
                id={`${id}-desc`}
                value={values.seoDescription}
                maxLength={200}
                rows={2}
                placeholder={seoDefaults.description}
                onChange={(e) => set("seoDescription", e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the greyed-out text, taken from your content.
              </p>
            </div>
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-background/90 px-4 py-3 backdrop-blur">
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Save design
          </Button>
          {dirty ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setValues(saved)}
            >
              Undo changes
            </Button>
          ) : null}
          <p
            role={status?.tone === "error" ? "alert" : "status"}
            className={`text-sm ${status?.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {status?.text ?? (dirty ? "Unsaved changes" : "")}
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <Card title="Hero image" hint="The picture next to your name at the top. Saved right away.">
          <ImageField
            label="Image"
            value={heroImage}
            onChange={saveHeroImage}
            siteId={siteId}
            uploadsEnabled={uploadsEnabled}
          />
        </Card>
        <Card title="Section order">
          <SectionOrder siteId={siteId} initial={sections} onSaved={refreshPreview} />
        </Card>
        <section className="hidden rounded-2xl border border-white/10 bg-card/50 p-3 lg:block">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-medium">Preview (saved design)</h2>
            <a
              href={`/preview/${siteId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">full preview (opens in a new tab)</span>
            </a>
          </div>
          <div className="relative h-96 overflow-hidden rounded-lg border border-white/10 bg-white">
            <iframe
              key={previewKey}
              src={`/preview/${siteId}`}
              title="Preview of your site"
              tabIndex={-1}
              className="pointer-events-none absolute top-0 left-0 h-[1280px] w-[1280px] origin-top-left scale-[0.3]"
            />
          </div>
        </section>
        <a
          href={`/preview/${siteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"
        >
          Open preview <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
