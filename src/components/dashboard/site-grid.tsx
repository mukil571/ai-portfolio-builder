import { ExternalLink, Eye, Globe, MessageCircleQuestion, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { OwnerSiteSummary } from "@/lib/db/queries/sites";

export function EmptySites() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 bg-card/30 px-6 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-from)]/25 to-[var(--brand-to)]/15 ring-1 ring-white/10">
        <Globe className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">No websites yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Create your first site. Its assistant will only answer from facts you approve.
      </p>
      <Link
        href="/dashboard/new"
        className={buttonVariants({ size: "lg", className: "mt-8 h-10 px-4" })}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        Create website
      </Link>
    </div>
  );
}

export function SiteGrid({ sites }: { sites: OwnerSiteSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sites.map((site) => (
        <li key={site.id}>
          <SiteCard site={site} />
        </li>
      ))}
      <li>
        <Link
          href="/dashboard/new"
          className="flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 text-sm font-medium text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
        >
          <Plus className="size-5" aria-hidden="true" />
          Add website
        </Link>
      </li>
    </ul>
  );
}

function SiteCard({ site }: { site: OwnerSiteSummary }) {
  const published = site.status === "published";
  return (
    <article className="flex h-full min-h-44 flex-col rounded-2xl border border-white/10 bg-card/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 truncate font-medium">{site.name}</h2>
        <span
          className={
            published
              ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300"
              : "shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {published ? "Live" : "Draft"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground capitalize">{site.kind}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link
          href={`/dashboard/sites/${site.id}/setup/content`}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {published ? "Edit" : "Continue setup"}
          <span className="sr-only"> {site.name}</span>
        </Link>
        <Link
          href={`/preview/${site.id}`}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Eye className="size-3.5" aria-hidden="true" />
          Preview
          <span className="sr-only"> {site.name}</span>
        </Link>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm">
        {published ? (
          <a
            href={`/site/${site.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">/site/{site.slug}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span className="text-muted-foreground">Not published</span>
        )}
        {site.openQuestions > 0 ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-from)]/15 px-2 py-0.5 text-xs font-medium text-[var(--brand-from)]"
            title="Unanswered visitor questions"
          >
            <MessageCircleQuestion className="size-3.5" aria-hidden="true" />
            {site.openQuestions}
            <span className="sr-only">unanswered questions</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function SiteGridSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
