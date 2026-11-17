import { and, asc, count, desc, eq, isNull } from "drizzle-orm";

import { sites, siteSections, unansweredQuestions } from "../schema";
import type { AppDb } from "../types";

export type OwnerSiteSummary = {
  id: string;
  name: string;
  slug: string;
  kind: "portfolio" | "business";
  status: "draft" | "published";
  updatedAt: Date;
  /** Open, un-merged visitor questions waiting for the owner. */
  openQuestions: number;
};

/**
 * Sites for the dashboard's "My Websites" page.
 * Ownership: ALWAYS scoped by `ownerId` (the authenticated user's id; never client input).
 */
export async function listSitesForOwner(db: AppDb, ownerId: string): Promise<OwnerSiteSummary[]> {
  const open = db
    .select({ siteId: unansweredQuestions.siteId, total: count().as("total") })
    .from(unansweredQuestions)
    .where(and(eq(unansweredQuestions.status, "open"), isNull(unansweredQuestions.mergedIntoId)))
    .groupBy(unansweredQuestions.siteId)
    .as("open");

  const rows = await db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      kind: sites.kind,
      status: sites.status,
      updatedAt: sites.updatedAt,
      openQuestions: open.total,
    })
    .from(sites)
    .leftJoin(open, eq(open.siteId, sites.id))
    .where(eq(sites.ownerId, ownerId))
    .orderBy(desc(sites.updatedAt));

  return rows.map((row) => ({ ...row, openQuestions: Number(row.openQuestions ?? 0) }));
}

const siteColumns = {
  id: sites.id,
  name: sites.name,
  slug: sites.slug,
  kind: sites.kind,
  template: sites.template,
  status: sites.status,
  theme: sites.theme,
  seo: sites.seo,
};

export type SiteWithSections = {
  site: {
    id: string;
    name: string;
    slug: string;
    kind: "portfolio" | "business";
    template: string;
    status: "draft" | "published";
    theme: unknown;
    seo: unknown;
  };
  sections: {
    type: (typeof siteSections.$inferSelect)["type"];
    position: number;
    content: unknown;
    isVisible: boolean;
  }[];
};

async function withSections(
  db: AppDb,
  site: SiteWithSections["site"] | undefined,
): Promise<SiteWithSections | null> {
  if (!site) return null;
  const sections = await db
    .select({
      type: siteSections.type,
      position: siteSections.position,
      content: siteSections.content,
      isVisible: siteSections.isVisible,
    })
    .from(siteSections)
    .where(eq(siteSections.siteId, site.id))
    .orderBy(asc(siteSections.position));
  return { site, sections };
}

/**
 * Public route data. ONLY returns a site whose status is "published"; drafts and
 * unknown slugs both return null (-> 404), so drafts never leak.
 */
export async function getPublishedSiteBySlug(
  db: AppDb,
  slug: string,
): Promise<SiteWithSections | null> {
  const [site] = await db
    .select(siteColumns)
    .from(sites)
    .where(and(eq(sites.slug, slug), eq(sites.status, "published")))
    .limit(1);
  return withSections(db, site);
}

/** Owner preview data (drafts included). Ownership: scoped by the authenticated owner's id. */
export async function getSiteForOwner(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<SiteWithSections | null> {
  const [site] = await db
    .select(siteColumns)
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return withSections(db, site);
}
