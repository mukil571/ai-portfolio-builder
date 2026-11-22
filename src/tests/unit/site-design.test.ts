import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createDraftSite,
  getEditableSite,
  publishSite,
  saveSectionContent,
} from "@/lib/db/queries/site-builder";
import { getSiteDesign, updateSiteDesign } from "@/lib/db/queries/site-design";
import { listPublishedSlugs } from "@/lib/db/queries/sites";
import { sites, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { designInputSchema, siteThemeSchema } from "@/lib/validation/site-theme";

import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;
let siteA: string;
let draftB: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "ana", name: "Ana", email: "ana@example.com", emailVerified: true },
    { id: "ben", name: "Ben", email: "ben@example.com", emailVerified: true },
  ]);
  siteA = await createDraftSite(db, "ana", {
    name: "Ana",
    kind: "portfolio",
    template: "minimal-mono",
  });
  draftB = await createDraftSite(db, "ben", { name: "Ben", kind: "business", template: "studio" });
  await saveSectionContent(db, "ana", siteA, "hero", { name: "Ana Silva", headline: "Designer" });
  await publishSite(db, "ana", siteA, "ana-silva");
}, 60_000);

afterAll(async () => {
  await close();
});

describe("site design", () => {
  it("switching template keeps every section's content", async () => {
    const before = await getEditableSite(db, "ana", siteA);
    const saved = await updateSiteDesign(db, "ana", siteA, {
      template: "editorial",
      theme: { accent: "#b45309", fontPair: "serif", defaultMode: "dark" },
      seo: { title: "Ana Silva" },
    });
    expect(saved).toEqual({ slug: "ana-silva", status: "published" });
    const after = await getEditableSite(db, "ana", siteA);
    expect(after!.template).toBe("editorial");
    expect(after!.sections).toEqual(before!.sections);
    const design = await getSiteDesign(db, "ana", siteA);
    expect(design!.theme).toEqual({ accent: "#b45309", fontPair: "serif", defaultMode: "dark" });
  });

  it("is owner-scoped", async () => {
    expect(await getSiteDesign(db, "ben", siteA)).toBeNull();
    expect(
      await updateSiteDesign(db, "ben", siteA, { template: "studio", theme: {}, seo: {} }),
    ).toBeNull();
    const [row] = await db.select().from(sites).where(eq(sites.id, siteA));
    expect(row!.template).toBe("editorial");
  });

  it("sitemap lists published sites only", async () => {
    const slugs = (await listPublishedSlugs(db)).map((s) => s.slug);
    expect(slugs).toContain("ana-silva");
    const [draft] = await db.select({ slug: sites.slug }).from(sites).where(eq(sites.id, draftB));
    expect(slugs).not.toContain(draft!.slug);
  });
});

describe("design input", () => {
  const base = {
    siteId: "00000000-0000-4000-8000-000000000000",
    template: "bento",
    accent: "",
    fontPair: "",
    defaultMode: "",
    seoTitle: "",
    seoDescription: "",
  };

  it("treats empty choices as 'template default'", () => {
    expect(designInputSchema.parse(base)).toMatchObject({
      accent: undefined,
      fontPair: undefined,
      defaultMode: undefined,
    });
  });

  it("rejects unknown templates, fonts and unsafe colours", () => {
    expect(designInputSchema.safeParse({ ...base, template: "nope" }).success).toBe(false);
    expect(designInputSchema.safeParse({ ...base, fontPair: "comic" }).success).toBe(false);
    expect(designInputSchema.safeParse({ ...base, accent: "red;x:url(y)" }).success).toBe(false);
    expect(designInputSchema.safeParse({ ...base, seoTitle: "x".repeat(71) }).success).toBe(false);
  });

  it("drops bad stored theme values instead of failing the page", () => {
    expect(
      siteThemeSchema.parse({ accent: "url(x)", fontPair: "comic", defaultMode: "dim" }),
    ).toEqual({});
  });
});
