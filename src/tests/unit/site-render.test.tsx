import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteTemplate } from "@/components/templates";
import type { StoredSection } from "@/lib/sites/render-plan";
import { sampleSections, sampleSite } from "@/lib/sites/sample-data";
import { siteMetadataText, toSiteView } from "@/lib/sites/view";

const render = (sections: StoredSection[], theme: unknown = sampleSite.theme) =>
  renderToStaticMarkup(
    <SiteTemplate site={toSiteView({ ...sampleSite, theme, slug: "sample" }, sections)} />,
  );

describe("Minimal Mono render", () => {
  const html = render(sampleSections);

  it("renders sections with content", () => {
    for (const id of ["about", "projects", "experience", "skills", "education", "faq", "contact"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Alex Rivera");
  });

  it("omits empty sections entirely (no placeholders)", () => {
    for (const id of ["gallery", "pricing", "services", "testimonials"]) {
      expect(html).not.toContain(`id="${id}"`);
    }
  });

  it("removing a section's content removes it from the page", () => {
    const withoutProjects = sampleSections.map((s) =>
      s.type === "projects" ? { ...s, content: { items: [] } } : s,
    );
    const out = render(withoutProjects);
    expect(out).not.toContain('id="projects"');
    // Nav link to the removed section disappears too.
    expect(out).not.toContain('href="#projects"');
  });

  it("applies the owner accent and default mode", () => {
    const out = render(sampleSections, { accent: "#ff5500", defaultMode: "dark" });
    expect(out).toContain("--site-accent:#ff5500");
    expect(out).toContain('data-mode="dark"');
  });

  it("ignores an invalid accent value instead of injecting it", () => {
    const out = render(sampleSections, { accent: "red;background:url(x)" });
    expect(out).not.toContain("url(x)");
  });

  it("has exactly one h1", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
  });
});

describe("siteMetadataText", () => {
  it("uses owner SEO when set", () => {
    const view = toSiteView({ ...sampleSite, slug: "s" }, sampleSections);
    expect(siteMetadataText(view).title).toBe("Alex Rivera — Product engineer");
  });

  it("falls back to hero name and headline when SEO is empty", () => {
    const view = toSiteView({ ...sampleSite, seo: {}, slug: "s" }, sampleSections);
    const { title, description } = siteMetadataText(view);
    expect(title).toBe("Alex Rivera — Product engineer for calm, fast web apps.");
    expect(description).toMatch(/^I design and build/);
  });
});
