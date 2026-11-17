import type { SiteSeo, SiteTheme, TemplateId } from "@/lib/validation/site-theme";
import type { RenderableSection } from "@/lib/validation/sections";

/** Everything a template needs to render a site (no DB types leak into components). */
export type SiteView = {
  name: string;
  slug: string;
  kind: "portfolio" | "business";
  template: TemplateId;
  theme: SiteTheme;
  seo: SiteSeo;
  sections: RenderableSection[];
};
