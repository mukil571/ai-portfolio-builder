import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteTemplate } from "@/components/templates";
import type { StoredSection } from "@/lib/sites/render-plan";
import { sampleSections, sampleSite } from "@/lib/sites/sample-data";
import { readableOn, templates } from "@/lib/sites/templates";
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

describe("templates", () => {
  const render = (template: string, theme: unknown = {}) =>
    renderToStaticMarkup(
      <SiteTemplate
        site={toSiteView({ ...sampleSite, template, theme, slug: "sample" }, sampleSections)}
      />,
    );

  it("every template renders the same content with its own defaults", () => {
    for (const t of templates) {
      const out = render(t.id);
      expect(out).toContain(`data-template="${t.id}"`);
      expect(out).toContain(`data-font="${t.fontPair}"`);
      expect(out).toContain(`data-mode="${t.mode}"`);
      expect(out).toContain(`--site-accent:${t.accent}`);
      for (const id of ["about", "projects", "contact"]) expect(out).toContain(`id="${id}"`);
      expect(out.match(/<h1/g)).toHaveLength(1);
    }
  });

  it("owner choices override template defaults", () => {
    const out = render("dark-dev", { accent: "#e11d48", fontPair: "serif", defaultMode: "light" });
    expect(out).toContain('data-font="serif"');
    expect(out).toContain('data-mode="light"');
    expect(out).toContain("--site-accent:#e11d48");
  });

  it("an unknown template falls back to Minimal Mono", () => {
    expect(render("retired-template")).toContain('data-template="minimal-mono"');
  });

  it("picks black or white text on the accent for contrast", () => {
    expect(readableOn("#ffffff")).toBe("#000000");
    expect(readableOn("#000000")).toBe("#ffffff");
    expect(readableOn("#3fb950")).toBe("#000000");
    expect(readableOn("#18181b")).toBe("#ffffff");
  });
});
