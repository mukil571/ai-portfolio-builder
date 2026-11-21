import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteTabs } from "@/components/dashboard/site-tabs";
import { KnowledgeSection } from "@/components/knowledge/knowledge-section";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { countQuestionsByStatus } from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { isUuid } from "@/lib/sites/slug";

export const metadata: Metadata = { title: "Knowledge Base · Loriyum" };

type Props = { params: Promise<{ siteId: string }> };

/** Knowledge Base tab for one site (owner only). */
export default function KnowledgePage({ params }: Props) {
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
        <Knowledge params={params} />
      </Suspense>
    </div>
  );
}

async function Knowledge({ params }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/knowledge`);
  if (!isUuid(siteId)) notFound();
  const site = await getEditableSite(getDb(), user.id, siteId);
  if (!site) notFound();
  const counts = await countQuestionsByStatus(getDb(), site.id);
  return (
    <>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">
        Knowledge Base
        <span className="mt-1 block text-base font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
          {site.name}
        </span>
      </h1>
      <SiteTabs siteId={site.id} current="knowledge" openQuestions={counts.open} />
      <KnowledgeSection ownerId={user.id} siteId={site.id} />
    </>
  );
}
