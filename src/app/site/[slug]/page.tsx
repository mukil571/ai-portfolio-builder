import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteTemplate } from "@/components/templates";
import { getPublicSiteView } from "@/lib/sites/public";
import { siteMetadataText } from "@/lib/sites/view";

/**
 * Public site. The full render must be static (cached data only), so the first request
 * for a slug waits for it and notFound() yields a real 404 status for drafts/unknown slugs.
 */
export const ensureStatic = "navigation";
/** Blocking on purpose: a draft/unknown slug must resolve to a real 404 before streaming. */
export const instant = false;

/** Cache Components needs at least one param; this invalid slug never touches the DB. */
export async function generateStaticParams() {
  return [{ slug: "_" }];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const view = await getPublicSiteView(slug);
  if (!view) return { title: "Site not found", robots: { index: false } };

  const { title, description } = siteMetadataText(view);
  const url = `/site/${view.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: view.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;
  const view = await getPublicSiteView(slug);
  if (!view) notFound();
  return <SiteTemplate site={{ ...view, track: true }} />;
}
