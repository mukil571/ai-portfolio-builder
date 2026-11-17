import { and, count, desc, eq, isNull } from "drizzle-orm";

import { sites, unansweredQuestions } from "../schema";
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
