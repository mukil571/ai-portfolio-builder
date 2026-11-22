import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteTabs } from "@/components/dashboard/site-tabs";
import { DesignPanel } from "@/components/design/design-panel";
import { siteFontVariables } from "@/components/templates/fonts";
import { getEnv } from "@/env";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { countQuestionsByStatus } from "@/lib/db/queries/inbox";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { getSiteDesign } from "@/lib/db/queries/site-design";
import { isUuid } from "@/lib/sites/slug";
import { toSiteView, siteMetadataText } from "@/lib/sites/view";

export const metadata: Metadata = { title: "Design · Loriyum" };

type Props = { params: Promise<{ siteId: string }> };

/** Design tab: template, colours, fonts, light/dark, hero image, section order, SEO. */
export default function DesignPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Websites
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-white/5" />}>
        <Design params={params} />
      </Suspense>
    </div>
  );
}

async function Design({ params }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/design`);
  if (!isUuid(siteId)) notFound();
  const db = getDb();
  const [site, design, counts] = await Promise.all([
    getEditableSite(db, user.id, siteId),
    getSiteDesign(db, user.id, siteId),
    countQuestionsByStatus(db, siteId),
  ]);
  if (!site || !design) notFound();

  const view = toSiteView({ ...site, theme: design.theme, seo: design.seo }, site.sections);
  // Defaults shown as placeholders: what search engines get if the owner leaves SEO empty.
  const defaults = siteMetadataText({ ...view, seo: {} });
  const hero = site.sections.find((s) => s.type === "hero");

  return (
    <div className={siteFontVariables}>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">
        Design
        <span className="mt-1 block text-base font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
          {site.name}
        </span>
      </h1>
      <SiteTabs siteId={siteId} current="design" openQuestions={counts.open} />
      <DesignPanel
        siteId={siteId}
        kind={site.kind}
        initial={{
          template: view.template,
          accent: view.theme.accent ?? "",
          fontPair: view.theme.fontPair ?? "",
          defaultMode: view.theme.defaultMode ?? "",
          seoTitle: view.seo.title ?? "",
          seoDescription: view.seo.description ?? "",
        }}
        seoDefaults={defaults}
        sections={site.sections.map((s) => s.type)}
        hero={(hero?.content as Record<string, unknown> | undefined) ?? {}}
        uploadsEnabled={Boolean(getEnv().BLOB_READ_WRITE_TOKEN)}
      />
    </div>
  );
}
