import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteTemplate } from "@/components/templates";
import { sampleSections, sampleSite } from "@/lib/sites/sample-data";
import { toSiteView } from "@/lib/sites/view";
import { templateIds } from "@/lib/validation/site-theme";

/** Fully static: every template id is prerendered, so params are known at build time. */
export const ensureStatic = "navigation";
/** Navigation may block on params (they're all prerendered anyway). */
export const instant = false;

/** Static preview of each template rendered with sample data (no database). */
export async function generateStaticParams() {
  return templateIds.map((template) => ({ template }));
}

type Props = { params: Promise<{ template: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { template } = await params;
  return { title: `${template} template preview · Loriyum`, robots: { index: false } };
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { template } = await params;
  if (!(templateIds as readonly string[]).includes(template)) notFound();
  const view = toSiteView({ ...sampleSite, slug: "sample", template }, sampleSections);
  return <SiteTemplate site={view} />;
}
