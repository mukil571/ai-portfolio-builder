import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AiSettingsPanel } from "@/components/ai/ai-settings-panel";
import { UsageMeter } from "@/components/ai/usage-meter";
import { SiteTabs } from "@/components/dashboard/site-tabs";
import { getEnv } from "@/env";
import { requireUser } from "@/lib/auth/session";
import { parseEncryptionSecret } from "@/lib/crypto/api-keys";
import { getDb } from "@/lib/db";
import { getOwnerAiSettings } from "@/lib/db/queries/ai-settings";
import { countQuestionsByStatus } from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { plans } from "@/lib/plans/plans";
import { getPlanStatus } from "@/lib/plans/usage";
import { isUuid } from "@/lib/sites/slug";

export const metadata: Metadata = { title: "AI & API · Loriyum" };

type Props = { params: Promise<{ siteId: string }> };

/** AI & API tab: Loriyum's AI (plan quota) or the owner's own key, per site. */
export default function AiPage({ params }: Props) {
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
        <Ai params={params} />
      </Suspense>
    </div>
  );
}

function hasEncryption(secret: string | undefined): boolean {
  try {
    parseEncryptionSecret(secret);
    return true;
  } catch {
    return false;
  }
}

async function Ai({ params }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/ai`);
  if (!isUuid(siteId)) notFound();
  const db = getDb();
  const [site, settings, counts, status] = await Promise.all([
    getEditableSite(db, user.id, siteId),
    getOwnerAiSettings(db, user.id, siteId),
    countQuestionsByStatus(db, siteId),
    getPlanStatus(db, user.id),
  ]);
  if (!site || !settings) notFound();
  const env = getEnv();

  return (
    <>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">
        AI &amp; API
        <span className="mt-1 block text-base font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
          {site.name}
        </span>
      </h1>
      <SiteTabs siteId={siteId} current="ai" openQuestions={counts.open} />
      <AiSettingsPanel
        siteId={siteId}
        initial={settings}
        platformReady={Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY)}
        byokReady={hasEncryption(env.API_KEY_ENCRYPTION_KEY)}
        planSummary={
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 text-sm">
              Your plan: <span className="font-medium">{plans[status.plan].name}</span> ·{" "}
              <Link href="/dashboard/plan" className="underline underline-offset-4">
                Change plan
              </Link>
            </p>
            <UsageMeter
              used={status.used}
              limit={status.limit}
              resetsOn={status.periodEnd.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            />
          </div>
        }
      />
    </>
  );
}
