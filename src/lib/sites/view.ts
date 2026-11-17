import {
  siteSeoSchema,
  siteThemeSchema,
  templateIds,
  type TemplateId,
} from "@/lib/validation/site-theme";

import { planSections, type StoredSection } from "./render-plan";
import type { SiteView } from "./types";

type SiteRow = {
  name: string;
  slug: string;
  kind: "portfolio" | "business";
  template: string;
  theme: unknown;
  seo: unknown;
};

/** Builds the render model from stored rows: parses theme/seo and plans the sections. */
export function toSiteView(site: SiteRow, sections: readonly StoredSection[]): SiteView {
  const template: TemplateId = (templateIds as readonly string[]).includes(site.template)
    ? (site.template as TemplateId)
    : "minimal-mono";
  return {
    name: site.name,
    slug: site.slug,
    kind: site.kind,
    template,
    theme: siteThemeSchema.parse(site.theme ?? {}),
    seo: siteSeoSchema.parse(site.seo ?? {}),
    sections: planSections(sections),
  };
}

/** Title/description for <head>, with sensible defaults when the owner left SEO empty. */
export function siteMetadataText(view: SiteView): { title: string; description: string } {
  const hero = view.sections.find((s) => s.type === "hero");
  const about = view.sections.find((s) => s.type === "about");
  const heroContent = hero?.type === "hero" ? hero.content : undefined;
  const title =
    view.seo.title ??
    [heroContent?.name ?? view.name, heroContent?.headline].filter(Boolean).join(" — ");
  const fallbackDescription =
    heroContent?.subheadline ??
    (about?.type === "about" ? about.content.body?.split("\n")[0] : undefined) ??
    `${view.name} on Loriyum`;
  const description = (view.seo.description ?? fallbackDescription).slice(0, 200);
  return { title, description };
}
