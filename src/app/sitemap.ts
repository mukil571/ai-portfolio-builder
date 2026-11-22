import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { getEnv } from "@/env";
import { getDb } from "@/lib/db";
import { listPublishedSlugs } from "@/lib/db/queries/sites";
import { appBaseUrl } from "@/lib/env/schema";

/** Home page + every published site. Refreshed hourly (drafts never appear). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  const base = appBaseUrl(getEnv());
  let sites: { slug: string; updatedAt: Date }[] = [];
  try {
    sites = await listPublishedSlugs(getDb());
  } catch (error) {
    // A sitemap without sites beats a failing one; details go to the log.
    console.error("[sitemap] could not list sites", (error as Error)?.message);
  }
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...sites.map((s) => ({
      url: `${base}/site/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
