"use client";

import { Check, ExternalLink, Eye, Loader2, PartyPopper, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { checkSlugAction, publishSiteAction } from "@/app/dashboard/sites/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Check = { state: "idle" | "checking" | "ok" | "error"; message?: string };

/** Wizard step 5: name, address with live availability check, preview, publish. */
export function PublishForm({
  siteId,
  initialName,
  initialSlug,
  appUrl,
  hasContent,
}: {
  siteId: string;
  initialName: string;
  initialSlug: string;
  appUrl: string;
  hasContent: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [check, setCheck] = useState<Check>({ state: initialSlug ? "checking" : "idle" });
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  /** Asks the server; only the newest request may update the status. */
  function requestCheck(value: string) {
    const id = ++requestId.current;
    void checkSlugAction({ siteId, slug: value }).then((result) => {
      if (id !== requestId.current) return; // a newer check superseded this one
      setCheck(result.ok ? { state: "ok" } : { state: "error", message: result.error });
    });
  }

  useEffect(() => {
    // Check the suggested address once on mount (status starts as "checking").
    if (initialSlug) requestCheck(initialSlug);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSlugChange(raw: string) {
    const value = raw.toLowerCase().replace(/\s+/g, "-");
    setSlug(value);
    setCheck({ state: "checking" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => requestCheck(value), 400);
  }

  function publish() {
    setError(null);
    startTransition(async () => {
      const result = await publishSiteAction({ siteId, name, slug });
      if (result.ok) setPublished(result.slug);
      else setError(result.error);
    });
  }

  if (published) {
    const url = `${appUrl}/site/${published}`;
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-8 text-center">
        <PartyPopper className="mx-auto size-8 text-emerald-300" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Your site is live</h2>
        <p className="mt-2 text-sm text-muted-foreground">Share it anywhere:</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm break-all underline underline-offset-4"
        >
          {url} <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <div className="mt-8 flex justify-center">
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "lg", className: "h-10 px-5" })}
          >
            Go to My Websites
          </Link>
        </div>
      </div>
    );
  }

  const canPublish = check.state === "ok" && name.trim().length > 0 && !pending;
  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="publish-name">Site name</Label>
        <Input
          id="publish-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="publish-slug">Site address</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="shrink-0 border-r border-input bg-white/5 px-3 py-2 font-mono text-xs text-muted-foreground">
            /site/
          </span>
          <input
            id="publish-slug"
            value={slug}
            maxLength={48}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="publish-slug-status"
            aria-invalid={check.state === "error" || undefined}
            onChange={(e) => onSlugChange(e.target.value)}
            className="h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
          />
        </div>
        <p
          id="publish-slug-status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs"
        >
          {check.state === "checking" ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Checking…
            </span>
          ) : check.state === "ok" ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <Check className="size-3" aria-hidden="true" /> {appUrl}/site/{slug} is available
            </span>
          ) : check.state === "error" ? (
            <span className="inline-flex items-center gap-1.5 text-destructive">
              <X className="size-3" aria-hidden="true" /> {check.message}
            </span>
          ) : null}
        </p>
      </div>

      {!hasContent ? (
        <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          Your site has no content yet, so it would be blank. Add at least your name in the Content
          step.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/preview/${siteId}`}
          target="_blank"
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-10 px-5" })}
        >
          <Eye aria-hidden="true" /> Preview
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
        <Button
          size="lg"
          className="h-10 px-5"
          disabled={!canPublish || !hasContent}
          onClick={publish}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Deploy site
        </Button>
      </div>
    </div>
  );
}
