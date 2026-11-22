import { ArrowLeft, BadgeCheck, Download, Forward } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WorkspaceHeader } from "@/components/dashboard/site-tabs";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { countQuestionsByStatus } from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { getTranscript, listConversations, listLeads } from "@/lib/db/queries/workspace";
import { timeAgo } from "@/lib/inbox/time";
import { isUuid } from "@/lib/sites/slug";
import { cn } from "cn";

export const metadata: Metadata = { title: "Conversations · Loriyum" };

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Chat transcripts and the emails visitors left, with CSV export. */
export default function ConversationsPage(props: Props) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Websites
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-white/5" />}>
        <Conversations {...props} />
      </Suspense>
    </div>
  );
}

const fmt = (d: Date) =>
  d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function Conversations({ params, searchParams }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/conversations`);
  if (!isUuid(siteId)) notFound();
  const db = getDb();
  const sp = await searchParams;
  const selected = typeof sp.c === "string" && isUuid(sp.c) ? sp.c : null;
  const [site, convs, leadRows, counts, transcript] = await Promise.all([
    getEditableSite(db, user.id, siteId),
    listConversations(db, user.id, siteId),
    listLeads(db, user.id, siteId),
    countQuestionsByStatus(db, siteId),
    selected ? getTranscript(db, user.id, siteId, selected) : Promise.resolve(null),
  ]);
  if (!site || !convs || !leadRows) notFound();
  const base = `/dashboard/sites/${siteId}/conversations`;

  return (
    <>
      <WorkspaceHeader
        title="Conversations"
        siteName={site.name}
        siteId={siteId}
        current="conversations"
        openQuestions={counts.open}
      />
      <div className="space-y-8">
        <section aria-labelledby="chats-heading">
          <h2 id="chats-heading" className="mb-3 text-lg font-semibold tracking-tight">
            Chats <span className="text-muted-foreground">({convs.length})</span>
          </h2>
          {convs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-muted-foreground">
              No chats yet. When visitors talk to your assistant, the conversations appear here.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <ul className="max-h-[32rem] space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-card/50 p-2">
                {convs.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`${base}?c=${c.id}`}
                      scroll={false}
                      aria-current={selected === c.id ? "true" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        selected === c.id ? "bg-white/10" : "hover:bg-white/5",
                      )}
                    >
                      <span className="line-clamp-1">{c.firstMessage ?? "(no message)"}</span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(c.lastMessageAt)} · {Math.ceil(c.messageCount / 2)} question
                        {c.messageCount > 2 ? "s" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="min-w-0 rounded-2xl border border-white/10 bg-card/50 p-4">
                {transcript ? (
                  <>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Started {fmt(transcript.startedAt)}
                    </p>
                    <ol className="space-y-3 text-sm">
                      {transcript.messages.map((m) => (
                        <li
                          key={m.id}
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap",
                            m.role === "visitor"
                              ? "ml-auto rounded-br-md bg-primary/20"
                              : "rounded-bl-md border border-white/10 bg-white/[0.03]",
                          )}
                        >
                          <span className="sr-only">
                            {m.role === "visitor" ? "Visitor: " : "Assistant: "}
                          </span>
                          {m.content}
                          {m.answered ? (
                            <span className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
                              <BadgeCheck className="size-3.5" aria-hidden="true" /> From your facts
                            </span>
                          ) : null}
                          {m.escalated ? (
                            <span className="mt-1 flex items-center gap-1 text-xs text-amber-200">
                              <Forward className="size-3.5" aria-hidden="true" /> Sent to your
                              Questions inbox
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {selected ? "That conversation wasn't found." : "Pick a chat to read it."}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="leads-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="leads-heading" className="text-lg font-semibold tracking-tight">
              Visitor emails <span className="text-muted-foreground">({leadRows.length})</span>
            </h2>
            {leadRows.length ? (
              <a
                href={`/api/sites/${siteId}/leads`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download aria-hidden="true" /> Download CSV
              </a>
            ) : null}
          </div>
          {leadRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-muted-foreground">
              No emails yet. Visitors can leave one when your assistant doesn&apos;t know an answer.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Asked about
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Answer emailed
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leadRows.map((l, i) => (
                    <tr key={`${l.email}-${i}`}>
                      <td className="px-4 py-2 break-all">{l.email}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.question ?? "—"}</td>
                      <td className="px-4 py-2">{l.notifiedAt ? "Yes" : "Not yet"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {fmt(l.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
