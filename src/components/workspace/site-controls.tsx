"use client";

import { ExternalLink, Globe, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import {
  deleteSiteAction,
  republishSiteAction,
  unpublishSiteAction,
  type WorkspaceResult,
} from "@/app/dashboard/sites/workspace-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Live/draft status with Unpublish / Publish again. */
export function PublishControls({
  siteId,
  slug,
  status,
  neverPublished,
}: {
  siteId: string;
  slug: string;
  status: "draft" | "published";
  neverPublished: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function run(action: () => Promise<WorkspaceResult>) {
    setNotice(null);
    start(async () => {
      const r = await action();
      setNotice(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className="rounded-2xl p-5 glass">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <Globe className="size-4 text-[var(--brand-from)]" aria-hidden="true" />
            {status === "published" ? "Your site is live" : "Your site is offline"}
          </p>
          {status === "published" ? (
            <a
              href={`/site/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">/site/{slug}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {neverPublished
                ? "Not published yet."
                : "Visitors see “not found” until you publish it again."}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Content edits on a live site show up immediately.
          </p>
        </div>
        {status === "published" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Take your site offline? You can publish it again any time.")) {
                run(() => unpublishSiteAction({ siteId }));
              }
            }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Unpublish
          </Button>
        ) : neverPublished ? (
          <Link
            href={`/dashboard/sites/${siteId}/setup/publish`}
            className={buttonVariants({ variant: "default" })}
          >
            Publish
          </Link>
        ) : (
          <Button disabled={pending} onClick={() => run(() => republishSiteAction({ siteId }))}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Publish again
          </Button>
        )}
      </div>
      {notice ? (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`mt-3 text-sm ${notice.ok ? "text-emerald-300" : "text-destructive"}`}
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}

/** Danger zone: delete the site after typing its name. */
export function DeleteSite({ siteId, siteName }: { siteId: string; siteName: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = typed.trim() === siteName.trim();

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-5">
      <h2 className="font-semibold tracking-tight">Delete this site</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently removes the site, its knowledge base, questions, conversations and visitor
        emails. This can&apos;t be undone.
      </p>
      {!open ? (
        <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          <Trash2 aria-hidden="true" /> Delete site…
        </Button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await deleteSiteAction({ siteId, confirmName: typed });
              if (r && !r.ok) setError(r.error);
            });
          }}
        >
          <label htmlFor={id} className="block text-sm">
            Type <strong className="font-semibold">{siteName}</strong> to confirm
          </label>
          <Input
            id={id}
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
            className="h-9 max-w-sm"
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Delete forever
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
