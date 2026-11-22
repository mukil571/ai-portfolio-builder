import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteTemplate } from "@/components/templates";
import { sampleBusinessSections, sampleBusinessSite } from "@/lib/sites/sample-business";
import { sampleSections, sampleSite } from "@/lib/sites/sample-data";
import { templateMeta } from "@/lib/sites/templates";
import { toSiteView } from "@/lib/sites/view";
import { templateIds, type TemplateId } from "@/lib/validation/site-theme";

/** Fully static: every template id is prerendered, so params are known at build time. */
export const ensureStatic = "navigation";
/** Navigation may block on params (they're all prerendered anyway). */
export const instant = false;

/** Static preview of each template rendered with sample data (no database). */
export async function generateStaticParams() {
  return templateIds.map((template) => ({ template }));
}

type Props = { params: Promise<{ template: string }> };

const isTemplate = (t: string): t is TemplateId => (templateIds as readonly string[]).includes(t);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { template } = await params;
  const name = isTemplate(template) ? templateMeta(template).name : template;
  return { title: `${name} template preview · Loriyum`, robots: { index: false } };
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { template } = await params;
  if (!isTemplate(template)) notFound();
  // Sample content matching the template's kind; no theme, so template defaults show.
  const business = templateMeta(template).kind === "business";
  const view = business
    ? toSiteView(
        { ...sampleBusinessSite, slug: "sample", template, theme: {} },
        sampleBusinessSections,
      )
    : toSiteView({ ...sampleSite, slug: "sample", template, theme: {} }, sampleSections);
  return <SiteTemplate site={view} />;
}
