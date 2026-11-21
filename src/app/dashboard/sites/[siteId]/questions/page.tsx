import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteTabs } from "@/components/dashboard/site-tabs";
import { QuestionsInbox, type QuestionView } from "@/components/inbox/questions-inbox";
import { getEnv } from "@/env";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { countQuestionsByStatus, getQuestionNotify, listQuestions } from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { timeAgo } from "@/lib/inbox/time";
import { isUuid } from "@/lib/sites/slug";
import { inboxFilterSchema } from "@/lib/validation/inbox";

export const metadata: Metadata = { title: "Questions · Loriyum" };

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Questions Inbox for one site (owner only): what visitors asked that the assistant didn't know. */
export default function QuestionsPage(props: Props) {
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
        <Inbox {...props} />
      </Suspense>
    </div>
  );
}

async function Inbox({ params, searchParams }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/questions`);
  if (!isUuid(siteId)) notFound();
  const db = getDb();
  const site = await getEditableSite(db, user.id, siteId);
  if (!site) notFound();
  const sp = await searchParams;
  const filter = inboxFilterSchema.parse({ status: sp.status, sort: sp.sort });

  const [questions, counts, notify] = await Promise.all([
    listQuestions(db, user.id, siteId, filter),
    countQuestionsByStatus(db, siteId),
    getQuestionNotify(db, user.id, siteId),
  ]);
  const views: QuestionView[] = (questions ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    askedCount: q.askedCount,
    status: q.status,
    lastAsked: timeAgo(q.lastAskedAt),
    answered: q.answeredAt ? timeAgo(q.answeredAt) : null,
    waitingVisitors: q.waitingVisitors,
    merged: q.merged,
    answer: q.answer,
  }));

  return (
    <>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">
        Questions
        <span className="mt-1 block text-base font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
          {site.name}
        </span>
      </h1>
      <SiteTabs siteId={siteId} current="questions" openQuestions={counts.open} />
      <QuestionsInbox
        siteId={siteId}
        status={filter.status}
        sort={filter.sort}
        counts={counts}
        questions={views}
        notify={notify ?? "instant"}
        suggestionsEnabled={Boolean(getEnv().GOOGLE_GENERATIVE_AI_API_KEY)}
      />
    </>
  );
}
