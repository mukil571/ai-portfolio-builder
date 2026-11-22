import { and, eq } from "drizzle-orm";

import type { SiteSeo, SiteTheme, TemplateId } from "@/lib/validation/site-theme";

import { sites } from "../schema";
import type { AppDb } from "../types";

/** Owner-scoped look-and-feel of one site (null if it isn't theirs). */
export async function getSiteDesign(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<{
  template: string;
  theme: unknown;
  seo: unknown;
  slug: string;
  status: "draft" | "published";
} | null> {
  const [row] = await db
    .select({
      template: sites.template,
      theme: sites.theme,
      seo: sites.seo,
      slug: sites.slug,
      status: sites.status,
    })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

/**
 * Saves template + theme + SEO. Content lives in site_sections and is never touched, so
 * switching templates can't lose anything. Returns slug/status for cache revalidation.
 */
export async function updateSiteDesign(
  db: AppDb,
  ownerId: string,
  siteId: string,
  design: { template: TemplateId; theme: SiteTheme; seo: SiteSeo },
): Promise<{ slug: string; status: "draft" | "published" } | null> {
  const [row] = await db
    .update(sites)
    .set({ template: design.template, theme: design.theme, seo: design.seo })
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .returning({ slug: sites.slug, status: sites.status });
  return row ?? null;
}
