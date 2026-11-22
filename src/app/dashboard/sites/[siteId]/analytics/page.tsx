import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StatCard, WorkspaceHeader } from "@/components/dashboard/site-tabs";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { countQuestionsByStatus } from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { getAnalytics } from "@/lib/db/queries/workspace";
import { isUuid } from "@/lib/sites/slug";

export const metadata: Metadata = { title: "Analytics · Loriyum" };

type Props = { params: Promise<{ siteId: string }> };

/** What visitors ask, how much the assistant could answer, and where the gaps are. */
export default function AnalyticsPage({ params }: Props) {
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
        <Analytics params={params} />
      </Suspense>
    </div>
  );
}

const statusLabel = { open: "Waiting for you", answered: "Answered", ignored: "Ignored" } as const;

async function Analytics({ params }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/analytics`);
  if (!isUuid(siteId)) notFound();
  const db = getDb();
  const [site, a, counts] = await Promise.all([
    getEditableSite(db, user.id, siteId),
    getAnalytics(db, user.id, siteId),
    countQuestionsByStatus(db, siteId),
  ]);
  if (!site || !a) notFound();
  const o = a.outcomes;
  const total = o.answered + o.escalated + o.general + o.other;
  const bars = [
    { label: "Answered from your facts", n: o.answered, color: "bg-emerald-400" },
    { label: "Passed to you (didn't know)", n: o.escalated, color: "bg-amber-400" },
    { label: "General tech answers", n: o.general, color: "bg-sky-400" },
    { label: "Off-topic, redirected", n: o.other, color: "bg-white/40" },
  ];

  return (
    <>
      <WorkspaceHeader
        title="Analytics"
        siteName={site.name}
        siteId={siteId}
        current="analytics"
        openQuestions={counts.open}
      />
      {total === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-muted-foreground">
          No chats in the last 30 days yet. Once visitors use your assistant, you&apos;ll see what
          they ask here.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="Replies (30 days)" value={total} />
            <StatCard
              label="Coverage"
              value={a.coverage === null ? "—" : `${Math.round(a.coverage * 100)}%`}
              hint="Questions about you answered from your facts"
            />
            <StatCard
              label="Waiting for you"
              value={counts.open}
              hint="Open in your Questions inbox"
            />
          </div>

          <section className="rounded-2xl p-5 glass">
            <h2 className="font-semibold tracking-tight">Answered vs passed to you</h2>
            <div
              className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/5"
              aria-hidden="true"
            >
              {bars.map((b) =>
                b.n ? (
                  <div
                    key={b.label}
                    className={b.color}
                    style={{ width: `${(b.n / total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {bars.map((b) => (
                <li key={b.label} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${b.color}`} aria-hidden="true" />
                  {b.label}: <span className="font-medium">{b.n}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl p-5 glass">
              <h2 className="font-semibold tracking-tight">Coverage gaps</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Most-asked questions your assistant couldn&apos;t answer.
              </p>
              {a.topQuestions.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">None. Nice work!</p>
              ) : (
                <ol className="mt-4 space-y-2 text-sm">
                  {a.topQuestions.map((q, i) => (
                    <li key={i} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        {q.question}
                        <span className="block text-xs text-muted-foreground">
                          {statusLabel[q.status]}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ×{q.askedCount}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <Link
                href={`/dashboard/sites/${siteId}/questions`}
                className="mt-4 inline-block text-sm underline underline-offset-4"
              >
                Answer them in Questions
              </Link>
            </section>

            <section className="rounded-2xl p-5 glass">
              <h2 className="font-semibold tracking-tight">Most used facts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                What your assistant answers most often.
              </p>
              {a.topFacts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No answers from facts yet.</p>
              ) : (
                <ol className="mt-4 space-y-2 text-sm">
                  {a.topFacts.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">{f.question}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">×{f.uses}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
