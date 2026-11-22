import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StatCard, WorkspaceHeader } from "@/components/dashboard/site-tabs";
import { DeleteSite, PublishControls } from "@/components/workspace/site-controls";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getOverview } from "@/lib/db/queries/workspace";
import { DRAFT_SLUG_PREFIX, isUuid } from "@/lib/sites/slug";

export const metadata: Metadata = { title: "Overview · Loriyum" };

type Props = { params: Promise<{ siteId: string }> };

/** Site Overview: status, last-30-day numbers, unpublish/delete. */
export default function OverviewPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Websites
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-white/5" />}>
        <Overview params={params} />
      </Suspense>
    </div>
  );
}

async function Overview({ params }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}`);
  if (!isUuid(siteId)) notFound();
  const o = await getOverview(getDb(), user.id, siteId);
  if (!o) notFound();
  const max = Math.max(1, ...o.visitsByDay.map((d) => d.visits));
  const replies = o.outcomes30.answered + o.outcomes30.escalated;

  return (
    <>
      <WorkspaceHeader
        title="Overview"
        siteName={o.site.name}
        siteId={siteId}
        current="overview"
        openQuestions={o.openQuestions}
      />
      <div className="space-y-6">
        <PublishControls
          siteId={siteId}
          slug={o.site.slug}
          status={o.site.status}
          neverPublished={o.site.slug.startsWith(DRAFT_SLUG_PREFIX)}
        />

        <section aria-labelledby="numbers-heading">
          <h2 id="numbers-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Last 30 days
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Visits"
              value={o.visits30.toLocaleString("en")}
              hint={`${o.visits7.toLocaleString("en")} in the last 7 days`}
            />
            <StatCard label="Chats" value={o.chats30.toLocaleString("en")} />
            <StatCard
              label="Answered from your facts"
              value={replies ? `${Math.round((o.outcomes30.answered / replies) * 100)}%` : "—"}
              hint={`${o.outcomes30.answered} answered · ${o.outcomes30.escalated} passed to you`}
            />
            <StatCard
              label="Waiting for you"
              value={o.openQuestions}
              hint={`${o.leads30} visitor email${o.leads30 === 1 ? "" : "s"} collected`}
            />
          </div>
        </section>

        <section className="rounded-2xl p-5 glass">
          <h2 className="font-semibold tracking-tight">Visits per day</h2>
          {o.visits30 === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No visits yet.{" "}
              {o.site.status === "published"
                ? "Share your site's link and they'll show up here."
                : "Publish your site to start counting."}
            </p>
          ) : (
            <>
              <div
                className="mt-4 flex h-32 items-end gap-[3px]"
                role="img"
                aria-label={`Visits per day for the last 30 days: ${o.visits30} in total`}
              >
                {o.visitsByDay.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.visits}`}
                    className="flex-1 rounded-t bg-[var(--brand-from)]/70"
                    style={{ height: `${Math.max(2, (d.visits / max) * 100)}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Counted privately: no cookies and nothing about visitors is stored.
          </p>
        </section>

        <DeleteSite siteId={siteId} siteName={o.site.name} />
      </div>
    </>
  );
}
