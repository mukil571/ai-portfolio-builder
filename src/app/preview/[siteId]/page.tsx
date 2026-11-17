import { Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteTemplate } from "@/components/templates";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getSiteForOwner } from "@/lib/db/queries/sites";
import { isUuid } from "@/lib/sites/slug";
import { toSiteView } from "@/lib/sites/view";

export const metadata: Metadata = { title: "Preview · Loriyum", robots: { index: false } };

type Props = { params: Promise<{ siteId: string }> };

/** Owner-only preview of any of their sites, drafts included. */
export default function PreviewPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading preview…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Props) {
  const { siteId } = await params;
  const user = await requireUser(`/preview/${siteId}`);
  if (!isUuid(siteId)) notFound();
  const row = await getSiteForOwner(getDb(), user.id, siteId);
  if (!row) notFound();

  const view = toSiteView(row.site, row.sections);
  const published = row.site.status === "published";
  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-3.5" aria-hidden="true" />
          Preview of “{row.site.name}” · {published ? "Published" : "Draft — only you can see this"}
        </span>
        <Link href="/dashboard" className="underline underline-offset-2">
          Back to dashboard
        </Link>
      </div>
      <SiteTemplate site={view} />
    </>
  );
}
