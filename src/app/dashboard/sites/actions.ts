"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getSiteDesign } from "@/lib/db/queries/site-design";
import {
  addSection,
  checkSlugAvailability,
  createDraftSite,
  publishSite,
  renameSite,
  reorderSections,
  saveSectionContent,
} from "@/lib/db/queries/site-builder";
import { siteCacheTag, slugProblemMessage } from "@/lib/sites/slug";
import {
  addSectionSchema,
  createSiteSchema,
  publishSchema,
  reorderSchema,
  saveSectionSchema,
  slugCheckSchema,
} from "@/lib/validation/site-builder";

/*
 * Wizard server actions. Each one: validates input with Zod, gets the user from the
 * session (never from the client), and calls an owner-scoped query.
 */

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NOT_FOUND = "We couldn't find that site.";

export async function createSiteAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser("/dashboard/new");
  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const siteId = await createDraftSite(getDb(), user.id, parsed.data);
  redirect(`/dashboard/sites/${siteId}/setup/content`);
}

export async function saveSectionAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = saveSectionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const { siteId, type, content } = parsed.data;
  const saved = await saveSectionContent(getDb(), user.id, siteId, type, content);
  if (!saved) return { ok: false, error: NOT_FOUND };
  // Edits to a live site show up immediately.
  if (saved.status === "published") updateTag(siteCacheTag(saved.slug));
  return { ok: true };
}

export async function reorderSectionsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const db = getDb();
  const ok = await reorderSections(db, user.id, parsed.data.siteId, parsed.data.order);
  if (!ok) return { ok: false, error: GENERIC_ERROR };
  // A new order on a live site shows up immediately.
  const site = await getSiteDesign(db, user.id, parsed.data.siteId);
  if (site?.status === "published") updateTag(siteCacheTag(site.slug));
  return { ok: true };
}

export async function addSectionAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addSectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const ok = await addSection(getDb(), user.id, parsed.data.siteId, parsed.data.type);
  return ok ? { ok: true } : { ok: false, error: "That section is already on your site." };
}

export async function checkSlugAction(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = slugCheckSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: slugProblemMessage.format };
  const problem = await checkSlugAvailability(getDb(), parsed.data.slug, parsed.data.siteId);
  return problem ? { ok: false, error: slugProblemMessage[problem] } : { ok: true };
}

export async function publishSiteAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const { siteId, name, slug } = parsed.data;

  const db = getDb();
  if (!(await renameSite(db, user.id, siteId, name))) return { ok: false, error: NOT_FOUND };
  const result = await publishSite(db, user.id, siteId, slug);
  if (!result.ok) {
    return {
      ok: false,
      error: result.problem === "not_found" ? NOT_FOUND : slugProblemMessage[result.problem],
    };
  }
  // A cached "not found" for this address (or the old one) must not survive publishing.
  updateTag(siteCacheTag(result.slug));
  if (result.previousSlug !== result.slug) updateTag(siteCacheTag(result.previousSlug));
  return { ok: true, slug: result.slug };
}
