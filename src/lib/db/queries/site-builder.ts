import { and, asc, eq, ne } from "drizzle-orm";

import { defaultSectionsByKind, type SiteKind } from "@/lib/sites/defaults";
import { checkSlugShape, DRAFT_SLUG_PREFIX, type SlugProblem } from "@/lib/sites/slug";
import type { SectionType } from "@/lib/validation/sections";

import { aiSettings, sites, siteSections } from "../schema";
import type { AppDb } from "../types";

/*
 * Create-website wizard data access. EVERY function is scoped by the authenticated
 * owner's id; a site that isn't theirs behaves exactly like a missing site.
 */

export type EditableSite = {
  id: string;
  name: string;
  slug: string;
  kind: SiteKind;
  template: string;
  status: "draft" | "published";
  sections: { type: SectionType; position: number; content: unknown; isVisible: boolean }[];
};

function randomSuffix(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10);
}

/** Creates a draft site with the default sections for its kind and AI off. */
export async function createDraftSite(
  db: AppDb,
  ownerId: string,
  input: { name: string; kind: SiteKind; template: string },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [site] = await tx
      .insert(sites)
      .values({
        ownerId,
        name: input.name,
        kind: input.kind,
        template: input.template,
        // Placeholder until the owner picks an address at publish (reserved prefix).
        slug: `${DRAFT_SLUG_PREFIX}${randomSuffix()}`,
      })
      .returning({ id: sites.id });
    const siteId = site!.id;
    await tx.insert(siteSections).values(
      defaultSectionsByKind[input.kind].map((type, position) => ({
        siteId,
        type,
        position,
        content: {},
      })),
    );
    await tx.insert(aiSettings).values({ siteId });
    return siteId;
  });
}

async function ownedSite(db: AppDb, ownerId: string, siteId: string) {
  const [site] = await db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      kind: sites.kind,
      template: sites.template,
      status: sites.status,
    })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return site;
}

export async function getEditableSite(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<EditableSite | null> {
  const site = await ownedSite(db, ownerId, siteId);
  if (!site) return null;
  const sections = await db
    .select({
      type: siteSections.type,
      position: siteSections.position,
      content: siteSections.content,
      isVisible: siteSections.isVisible,
    })
    .from(siteSections)
    .where(eq(siteSections.siteId, siteId))
    .orderBy(asc(siteSections.position));
  return { ...site, sections };
}

/** Saves one section's content. Returns the site's slug/status (for cache revalidation). */
export async function saveSectionContent(
  db: AppDb,
  ownerId: string,
  siteId: string,
  type: SectionType,
  content: Record<string, unknown>,
): Promise<{ slug: string; status: "draft" | "published" } | null> {
  const site = await ownedSite(db, ownerId, siteId);
  if (!site) return null;
  const updated = await db
    .update(siteSections)
    .set({ content })
    .where(and(eq(siteSections.siteId, siteId), eq(siteSections.type, type)))
    .returning({ id: siteSections.id });
  if (updated.length === 0) return null;
  await db.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, siteId));
  return { slug: site.slug, status: site.status };
}

/** Rewrites section positions to match `order` (must list exactly the site's sections). */
export async function reorderSections(
  db: AppDb,
  ownerId: string,
  siteId: string,
  order: SectionType[],
): Promise<boolean> {
  const site = await getEditableSite(db, ownerId, siteId);
  if (!site) return false;
  const current = new Set(site.sections.map((s) => s.type));
  if (order.length !== current.size || new Set(order).size !== order.length) return false;
  if (!order.every((t) => current.has(t))) return false;

  await db.transaction(async (tx) => {
    for (const [position, type] of order.entries()) {
      await tx
        .update(siteSections)
        .set({ position })
        .where(and(eq(siteSections.siteId, siteId), eq(siteSections.type, type)));
    }
  });
  return true;
}

/** Adds a section type the site doesn't have yet, at the end. */
export async function addSection(
  db: AppDb,
  ownerId: string,
  siteId: string,
  type: SectionType,
): Promise<boolean> {
  const site = await getEditableSite(db, ownerId, siteId);
  if (!site || site.sections.some((s) => s.type === type)) return false;
  const position = Math.max(-1, ...site.sections.map((s) => s.position)) + 1;
  await db.insert(siteSections).values({ siteId, type, position, content: {} });
  return true;
}

export async function renameSite(
  db: AppDb,
  ownerId: string,
  siteId: string,
  name: string,
): Promise<boolean> {
  const updated = await db
    .update(sites)
    .set({ name })
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .returning({ id: sites.id });
  return updated.length > 0;
}

/** Is `slug` usable for this site? (its own current slug counts as available) */
export async function checkSlugAvailability(
  db: AppDb,
  slug: string,
  siteId?: string,
): Promise<SlugProblem | null> {
  const shape = checkSlugShape(slug);
  if (shape) return shape;
  const [taken] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(siteId ? and(eq(sites.slug, slug), ne(sites.id, siteId)) : eq(sites.slug, slug))
    .limit(1);
  return taken ? "taken" : null;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  for (let e: unknown = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
  }
  return false;
}

export type PublishResult =
  | { ok: true; slug: string; previousSlug: string }
  | { ok: false; problem: SlugProblem | "not_found" };

/** Sets the final address and publishes. Handles collisions, including races. */
export async function publishSite(
  db: AppDb,
  ownerId: string,
  siteId: string,
  slug: string,
): Promise<PublishResult> {
  const site = await ownedSite(db, ownerId, siteId);
  if (!site) return { ok: false, problem: "not_found" };
  const problem = await checkSlugAvailability(db, slug, siteId);
  if (problem) return { ok: false, problem };
  try {
    await db
      .update(sites)
      .set({ slug, status: "published", publishedAt: new Date() })
      .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)));
  } catch (error) {
    // Someone else took the slug between the check and the update.
    if (isUniqueViolation(error)) return { ok: false, problem: "taken" };
    throw error;
  }
  return { ok: true, slug, previousSlug: site.slug };
}

/** True if `ownerId` owns `siteId`. */
export async function ownsSite(db: AppDb, ownerId: string, siteId: string): Promise<boolean> {
  return Boolean(await ownedSite(db, ownerId, siteId));
}
