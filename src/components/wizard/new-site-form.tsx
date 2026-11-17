"use client";

import { Briefcase, Check, Loader2, Lock, User } from "lucide-react";
import { useState, useTransition } from "react";

import { createSiteAction } from "@/app/dashboard/sites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Stepper } from "./stepper";

type Kind = "portfolio" | "business";

const kinds: { id: Kind; title: string; body: string; icon: typeof User }[] = [
  {
    id: "portfolio",
    title: "Portfolio",
    body: "For freelancers, job seekers and creators: projects, experience, skills.",
    icon: User,
  },
  {
    id: "business",
    title: "Business / Product",
    body: "For studios, local businesses and products: services, pricing, testimonials.",
    icon: Briefcase,
  },
];

const comingSoon: Record<Kind, string[]> = {
  portfolio: ["Bento", "Dark Dev", "Editorial"],
  business: ["SaaS Launch", "Studio", "Local Pro", "Product Spotlight"],
};

/** Wizard steps 1 (type) and 2 (template), then creates the draft site. */
export function NewSiteForm({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<Kind>("portfolio");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createSiteAction({ name, kind, template: "minimal-mono" });
      // On success the action redirects; we only get here on failure.
      if (result && !result.ok) setError(result.error);
    });
  }

  if (step === 1) {
    return (
      <div className="space-y-8">
        <Stepper current="type" />
        <fieldset>
          <legend className="text-lg font-semibold tracking-tight">What are you building?</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {kinds.map((k) => {
              const selected = kind === k.id;
              return (
                <label
                  key={k.id}
                  className={`relative flex cursor-pointer flex-col rounded-2xl border p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-card/50 hover:border-white/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k.id}
                    checked={selected}
                    onChange={() => setKind(k.id)}
                    className="sr-only"
                  />
                  <k.icon className="size-6 text-[var(--brand-from)]" aria-hidden="true" />
                  <span className="mt-4 font-medium">{k.title}</span>
                  <span className="mt-1 text-sm text-muted-foreground">{k.body}</span>
                  {selected ? (
                    <Check
                      className="absolute top-4 right-4 size-5 text-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="max-w-sm space-y-2">
          <Label htmlFor="site-name">Site name</Label>
          <Input
            id="site-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Only you see this; you can change it later.
          </p>
        </div>

        <Button size="lg" className="h-10 px-5" disabled={!name.trim()} onClick={() => setStep(2)}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Stepper current="template" />
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Choose a template</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates change the look, never your content. You can switch later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border-2 border-primary bg-card/60">
          <div className="relative h-56 overflow-hidden border-b border-white/10 bg-white">
            {/* Live preview of the real template with sample content, scaled down. */}
            <iframe
              src="/templates/minimal-mono"
              title="Minimal Mono template preview"
              loading="lazy"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 h-[900px] w-[1280px] origin-top-left scale-[0.25]"
            />
          </div>
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Minimal Mono</p>
              <p className="text-xs text-muted-foreground">Clean, monochrome, light and dark</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              <Check className="size-3" aria-hidden="true" /> Selected
            </span>
          </div>
          <a
            href="/templates/minimal-mono"
            target="_blank"
            rel="noopener noreferrer"
            className="block border-t border-white/10 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Open full preview <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>

        {comingSoon[kind].map((t) => (
          <div
            key={t}
            aria-disabled="true"
            className="flex flex-col justify-between rounded-2xl border border-dashed border-white/10 p-4 text-muted-foreground"
          >
            <div className="flex h-40 items-center justify-center rounded-xl bg-white/[0.03]">
              <Lock className="size-5" aria-hidden="true" />
            </div>
            <div className="mt-4">
              <p className="font-medium">{t}</p>
              <p className="text-xs">Coming soon</p>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-10 px-5"
          onClick={() => setStep(1)}
          disabled={pending}
        >
          Back
        </Button>
        <Button size="lg" className="h-10 px-5" onClick={create} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Use Minimal Mono
        </Button>
      </div>
    </div>
  );
}
