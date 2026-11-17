import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";
import { getPublishedSiteBySlug } from "@/lib/db/queries/sites";

import { isValidSlug, siteCacheTag } from "./slug";
import type { SiteView } from "./types";
import { toSiteView } from "./view";

/**
 * Published site for /site/[slug], cached per slug. Drafts and unknown slugs -> null.
 * Invalidate with revalidateTag(siteCacheTag(slug)) on publish / edit / unpublish
 * (Phase 3); cacheLife("hours") bounds staleness for out-of-band DB changes (seed).
 */
export async function getPublicSiteView(slug: string): Promise<SiteView | null> {
  "use cache";
  cacheTag(siteCacheTag(slug));
  cacheLife("hours");

  if (!isValidSlug(slug)) return null;
  const row = await getPublishedSiteBySlug(getDb(), slug);
  return row ? toSiteView(row.site, row.sections) : null;
}
