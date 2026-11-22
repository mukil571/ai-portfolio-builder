import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";
import { getWidgetDisplay } from "@/lib/db/queries/ai-settings";
import { assistantEnabledFor, ownerDisplayName } from "@/lib/db/queries/chat";
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
  const db = getDb();
  const row = await getPublishedSiteBySlug(db, slug);
  if (!row) return null;
  const view = toSiteView(row.site, row.sections);
  const enabled = await assistantEnabledFor(db, [row.site.id]);
  if (enabled.has(row.site.id)) {
    view.assistant = {
      owner: await ownerDisplayName(db, row.site.id, row.site.name),
      ...(await getWidgetDisplay(db, row.site.id)),
    };
  }
  return view;
}
