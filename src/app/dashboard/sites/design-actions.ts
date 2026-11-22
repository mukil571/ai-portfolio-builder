"use server";

import { updateTag } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { updateSiteDesign } from "@/lib/db/queries/site-design";
import { siteCacheTag } from "@/lib/sites/slug";
import { designInputSchema } from "@/lib/validation/site-theme";

export type DesignResult = { ok: true } | { ok: false; error: string };

/** Owner saves template, colours, fonts, default mode and SEO text for one site. */
export async function saveDesignAction(input: unknown): Promise<DesignResult> {
  const user = await requireUser();
  const parsed = designInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your choices." };
  }
  const d = parsed.data;
  const saved = await updateSiteDesign(getDb(), user.id, d.siteId, {
    template: d.template,
    theme: { accent: d.accent, fontPair: d.fontPair, defaultMode: d.defaultMode },
    seo: { title: d.seoTitle || undefined, description: d.seoDescription || undefined },
  });
  if (!saved) return { ok: false, error: "We couldn't find that site." };
  if (saved.status === "published") updateTag(siteCacheTag(saved.slug));
  return { ok: true };
}
