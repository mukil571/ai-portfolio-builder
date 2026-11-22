import type { MetadataRoute } from "next";

import { getPublicEnv } from "@/env";

/** Public pages are crawlable; the dashboard, previews, API and template samples are not. */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/site/"],
      disallow: ["/dashboard", "/preview", "/api", "/templates", "/login", "/signup"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
