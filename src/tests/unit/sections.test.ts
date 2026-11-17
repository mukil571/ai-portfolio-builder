import { describe, expect, it } from "vitest";

import { planSections, type StoredSection } from "@/lib/sites/render-plan";
import { parseSection } from "@/lib/validation/sections";

const s = (type: StoredSection["type"], position: number, content: unknown, isVisible = true) => ({
  type,
  position,
  content,
  isVisible,
});

describe("planSections", () => {
  it("orders by position and keeps sections with content", () => {
    const plan = planSections([
      s("about", 2, { body: "I build things." }),
      s("hero", 1, { name: "Alex" }),
    ]);
    expect(plan.map((p) => p.type)).toEqual(["hero", "about"]);
  });

  it("omits sections whose content is empty, blank or missing", () => {
    const plan = planSections([
      s("hero", 0, { name: "Alex" }),
      s("about", 1, { heading: "About", body: "   " }),
      s("projects", 2, { items: [] }),
      s("faq", 3, {}),
      s("contact", 4, { heading: "Say hi" }),
      s("social", 5, null),
    ]);
    expect(plan.map((p) => p.type)).toEqual(["hero"]);
  });

  it("removing a section's content removes it from the page", () => {
    const withContent = planSections([s("hero", 0, { name: "A" }), s("about", 1, { body: "Hi" })]);
    const emptied = planSections([s("hero", 0, { name: "A" }), s("about", 1, { body: "" })]);
    expect(withContent.map((p) => p.type)).toContain("about");
    expect(emptied.map((p) => p.type)).not.toContain("about");
  });

  it("skips hidden sections", () => {
    expect(planSections([s("about", 0, { body: "Hi" }, false)])).toEqual([]);
  });

  it("drops invalid list items but keeps the valid ones", () => {
    const [projects] = planSections([
      s("projects", 0, {
        items: [{ title: "Good" }, { description: "no title" }, "garbage", { title: "  " }],
      }),
    ]);
    expect(projects?.type).toBe("projects");
    expect(projects?.type === "projects" && projects.content.items.map((i) => i.title)).toEqual([
      "Good",
    ]);
  });

  it("omits a list section when every item is invalid", () => {
    expect(planSections([s("testimonials", 0, { items: [{ quote: "no author" }] })])).toEqual([]);
  });
});

describe("section link safety", () => {
  it.each(["javascript:alert(1)", "data:text/html,hi", "  JavaScript:alert(1)"])(
    "rejects unsafe link %s",
    (url) => {
      expect(parseSection("hero", { name: "A", ctaUrl: url })).toBeNull();
      const parsed = parseSection("projects", { items: [{ title: "P", url }] });
      expect(parsed?.type === "projects" && parsed.content.items).toEqual([]);
    },
  );

  it.each(["https://example.com", "mailto:a@b.co", "tel:+15551234", "#contact"])(
    "accepts safe link %s",
    (url) => {
      expect(parseSection("hero", { name: "A", ctaUrl: url })).not.toBeNull();
    },
  );

  it("requires alt text for gallery images", () => {
    const parsed = parseSection("gallery", {
      items: [
        { imageUrl: "https://img.example/a.jpg" },
        { imageUrl: "https://img.example/b.jpg", alt: "Studio" },
      ],
    });
    expect(parsed?.type === "gallery" && parsed.content.items.map((i) => i.alt)).toEqual([
      "Studio",
    ]);
  });

  it("only allows http(s) image URLs", () => {
    const parsed = parseSection("hero", { name: "A", imageUrl: "javascript:alert(1)" });
    expect(parsed).toBeNull();
  });
});
