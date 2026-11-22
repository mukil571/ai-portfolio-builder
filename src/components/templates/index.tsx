import type { SiteView } from "@/lib/sites/types";

import { SiteShell } from "./site-shell";

/** Template registry: every template is a CSS theme over the shared shell and sections. */
export function SiteTemplate({ site }: { site: SiteView }) {
  return <SiteShell site={site} />;
}
