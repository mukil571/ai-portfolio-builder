import { ArrowLeft, BookOpenCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ContentEditor } from "@/components/wizard/content-editor";
import { PublishForm } from "@/components/wizard/publish-form";
import { Stepper } from "@/components/wizard/stepper";
import { getEnv } from "@/env";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { planSections } from "@/lib/sites/render-plan";
import { DRAFT_SLUG_PREFIX, isUuid, slugify, checkSlugShape } from "@/lib/sites/slug";

export const metadata: Metadata = { title: "Set up your site · Loriyum" };

const steps = ["content", "knowledge", "publish"] as const;
type Step = (typeof steps)[number];

type Props = { params: Promise<{ siteId: string; step: string }> };

export default function SetupPage({ params }: Props) {
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
        <Setup params={params} />
      </Suspense>
    </div>
  );
}

async function Setup({ params }: Props) {
  const { siteId, step } = await params;
  const user = await requireUser(`/dashboard/sites/${siteId}/setup/${step}`);
  if (!isUuid(siteId) || !(steps as readonly string[]).includes(step)) notFound();
  const site = await getEditableSite(getDb(), user.id, siteId);
  if (!site) notFound();
  const current = step as Step;
  const env = getEnv();

  const titles: Record<Step, string> = {
    content: "Add your content",
    knowledge: "Teach your assistant",
    publish: "Choose an address and deploy",
  };

  return (
    <>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">
        {titles[current]}{" "}
        <span className="mt-1 block text-base font-normal text-muted-foreground sm:mt-0 sm:inline">
          <span className="hidden sm:inline">· </span>
          {site.name}
        </span>
      </h1>
      <Stepper current={current} siteId={site.id} />

      {current === "content" ? (
        <ContentEditor
          siteId={site.id}
          sections={site.sections.map((s) => ({ type: s.type, content: s.content }))}
          uploadsEnabled={Boolean(env.BLOB_READ_WRITE_TOKEN)}
        />
      ) : current === "knowledge" ? (
        <KnowledgePlaceholder siteId={site.id} />
      ) : (
        <PublishForm
          siteId={site.id}
          initialName={site.name}
          initialSlug={suggestSlug(site.slug, site.sections)}
          appUrl={env.NEXT_PUBLIC_APP_URL}
          hasContent={planSections(site.sections).length > 0}
        />
      )}
    </>
  );
}

/** Keep a real slug; for a draft placeholder suggest one from the hero name. */
function suggestSlug(slug: string, sections: { type: string; content: unknown }[]) {
  if (!slug.startsWith(DRAFT_SLUG_PREFIX)) return slug;
  const hero = sections.find((s) => s.type === "hero")?.content as { name?: unknown } | undefined;
  const fromName = typeof hero?.name === "string" ? slugify(hero.name) : "";
  return fromName && !checkSlugShape(fromName) ? fromName : "";
}

function KnowledgePlaceholder({ siteId }: { siteId: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-card/50 p-8 text-center">
        <BookOpenCheck className="mx-auto size-8 text-[var(--brand-from)]" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">Knowledge base is coming next</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Soon you&apos;ll add facts here (rates, availability, policies) so your site&apos;s
          assistant can answer visitors. It will only ever use facts you approve. You can skip this
          for now.
        </p>
      </div>
      <div className="flex justify-between">
        <Link
          href={`/dashboard/sites/${siteId}/setup/content`}
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-10 px-5" })}
        >
          Back
        </Link>
        <Link
          href={`/dashboard/sites/${siteId}/setup/publish`}
          className={buttonVariants({ size: "lg", className: "h-10 px-5" })}
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
