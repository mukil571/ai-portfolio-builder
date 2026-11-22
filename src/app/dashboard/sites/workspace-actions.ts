"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuth } from "@/lib/auth";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { deleteAccount } from "@/lib/db/queries/account";
import { setChatbotSettings } from "@/lib/db/queries/ai-settings";
import { getSiteDesign } from "@/lib/db/queries/site-design";
import { publishSite } from "@/lib/db/queries/site-builder";
import { deleteSite, unpublishSite } from "@/lib/db/queries/workspace";
import { DRAFT_SLUG_PREFIX, siteCacheTag } from "@/lib/sites/slug";
import { chatbotSettingsSchema } from "@/lib/validation/ai";

export type WorkspaceResult = { ok: true; message?: string } | { ok: false; error: string };

const GENERIC = "Something went wrong. Please try again.";
const NOT_FOUND = "We couldn't find that site.";
const siteIdSchema = z.object({ siteId: z.uuid() });

/** Takes a live site offline; its address is kept for when it's published again. */
export async function unpublishSiteAction(input: unknown): Promise<WorkspaceResult> {
  const user = await requireUser();
  const parsed = siteIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const result = await unpublishSite(getDb(), user.id, parsed.data.siteId);
  if (!result) return { ok: false, error: "That site isn't live." };
  updateTag(siteCacheTag(result.slug));
  return { ok: true, message: "Your site is offline. Visitors now see “not found”." };
}

/** Puts an unpublished site back online at its previous address. */
export async function republishSiteAction(input: unknown): Promise<WorkspaceResult> {
  const user = await requireUser();
  const parsed = siteIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const db = getDb();
  const site = await getSiteDesign(db, user.id, parsed.data.siteId);
  if (!site) return { ok: false, error: NOT_FOUND };
  if (site.slug.startsWith(DRAFT_SLUG_PREFIX)) {
    return { ok: false, error: "Choose an address first in the Publish step." };
  }
  const result = await publishSite(db, user.id, parsed.data.siteId, site.slug);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.problem === "taken"
          ? "Someone else took this address meanwhile. Pick a new one in the Publish step."
          : GENERIC,
    };
  }
  updateTag(siteCacheTag(result.slug));
  return { ok: true, message: "Your site is live again." };
}

const deleteSiteSchema = z.object({ siteId: z.uuid(), confirmName: z.string().max(200) });

/** Permanently deletes a site and everything in it; the owner must type its name. */
export async function deleteSiteAction(input: unknown): Promise<WorkspaceResult> {
  const user = await requireUser();
  const parsed = deleteSiteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const db = getDb();
  const site = await getSiteDesign(db, user.id, parsed.data.siteId);
  if (!site) return { ok: false, error: NOT_FOUND };
  const deleted = await deleteSite(db, user.id, parsed.data.siteId);
  if (!deleted) return { ok: false, error: NOT_FOUND };
  updateTag(siteCacheTag(deleted.slug));
  redirect("/dashboard");
}

export async function saveChatbotSettingsAction(input: unknown): Promise<WorkspaceResult> {
  const user = await requireUser();
  const parsed = chatbotSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  const { siteId, ...settings } = parsed.data;
  const saved = await setChatbotSettings(getDb(), user.id, siteId, settings);
  if (!saved) return { ok: false, error: NOT_FOUND };
  updateTag(siteCacheTag(saved.slug));
  return { ok: true, message: "Chatbot settings saved." };
}

const deleteAccountSchema = z.object({ confirmEmail: z.string().trim().max(254) });

/**
 * Permanently deletes the signed-in account and all its data. The owner must type their
 * email. Signs out first so no cached session outlives the account.
 */
export async function deleteAccountAction(input: unknown): Promise<WorkspaceResult> {
  const user = await requireUser("/dashboard/account");
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  if (parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "Type your account email exactly to confirm." };
  }
  await getAuth().api.signOut({ headers: await headers() });
  const slugs = await deleteAccount(getDb(), user.id);
  for (const slug of slugs ?? []) updateTag(siteCacheTag(slug));
  redirect("/?deleted=1");
}
