import { ImageResponse } from "next/og";

import { getPublicSiteView } from "@/lib/sites/public";
import { resolveTheme, templateMeta } from "@/lib/sites/templates";
import { siteMetadataText } from "@/lib/sites/view";

export const alt = "Website preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share image for a published site: name, headline and the site's own colours. */
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await getPublicSiteView(slug);
  const meta = view ? templateMeta(view.template) : null;
  const look = view ? resolveTheme(view.template, view.theme) : null;
  const hero = view?.sections.find((s) => s.type === "hero");
  const name = (hero?.type === "hero" && hero.content.name) || view?.name || "Loriyum";
  const headline =
    (hero?.type === "hero" && hero.content.headline) ||
    (view ? siteMetadataText(view).description : "Websites with an assistant you can trust.");
  // Light/dark follows the site's default; swatch colours are the template's own.
  const dark = look?.mode === "dark";
  const bg = dark ? "#0b0b0f" : (meta?.swatch.bg ?? "#fafaf9");
  const fg = dark ? "#f5f5f7" : (meta?.swatch.fg ?? "#18181b");
  const accent = look?.accent ?? "#8b7cf6";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: bg,
        color: fg,
      }}
    >
      <div
        style={{ display: "flex", width: 96, height: 12, borderRadius: 6, background: accent }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
          {name.slice(0, 60)}
        </div>
        <div style={{ marginTop: 28, fontSize: 38, opacity: 0.75, lineHeight: 1.3 }}>
          {headline.slice(0, 140)}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, opacity: 0.6 }}>Built with Loriyum</div>
    </div>,
    size,
  );
}
