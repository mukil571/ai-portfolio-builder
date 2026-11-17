import type { SiteView } from "@/lib/sites/types";

import { MinimalMonoSite } from "./minimal-mono";

/** Template registry: themes over the shared section components. */
export function SiteTemplate({ site }: { site: SiteView }) {
  switch (site.template) {
    case "minimal-mono":
      return <MinimalMonoSite site={site} />;
  }
}
