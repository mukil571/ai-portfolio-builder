import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addSection,
  checkSlugAvailability,
  createDraftSite,
  getEditableSite,
  publishSite,
  renameSite,
  reorderSections,
  saveSectionContent,
} from "@/lib/db/queries/site-builder";
import { getPublishedSiteBySlug } from "@/lib/db/queries/sites";
import { aiSettings, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { defaultSectionsByKind } from "@/lib/sites/defaults";
import { checkSlugShape, slugify } from "@/lib/sites/slug";

import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;
let siteId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true },
    { id: "intruder", name: "Intruder", email: "intruder@example.com", emailVerified: true },
  ]);
  siteId = await createDraftSite(db, "owner", {
    name: "My portfolio",
    kind: "portfolio",
    template: "minimal-mono",
  });
}, 60_000);

afterAll(async () => {
  await close();
});

describe("createDraftSite", () => {
  it("creates a draft with a reserved placeholder slug, default sections and AI off", async () => {
    const site = await getEditableSite(db, "owner", siteId);
    expect(site?.status).toBe("draft");
    expect(site?.slug).toMatch(/^draft-[a-z0-9]{10}$/);
    expect(site?.sections.map((s) => s.type)).toEqual(defaultSectionsByKind.portfolio);
    const [ai] = await db.select().from(aiSettings);
    expect(ai?.mode).toBe("none");
    expect(ai?.allowGeneralAnswers).toBe(false);
  });
});

describe("ownership (every builder function)", () => {
  it("hides the site from another owner", async () => {
    expect(await getEditableSite(db, "intruder", siteId)).toBeNull();
  });

  it("refuses edits, reorders, additions, renames and publishing by another owner", async () => {
    expect(
      await saveSectionContent(db, "intruder", siteId, "about", { body: "hacked" }),
    ).toBeNull();
    expect(
      await reorderSections(db, "intruder", siteId, [...defaultSectionsByKind.portfolio].reverse()),
    ).toBe(false);
    expect(await addSection(db, "intruder", siteId, "gallery")).toBe(false);
    expect(await renameSite(db, "intruder", siteId, "Hacked")).toBe(false);
    expect(await publishSite(db, "intruder", siteId, "hacked-site")).toEqual({
      ok: false,
      problem: "not_found",
    });

    const site = await getEditableSite(db, "owner", siteId);
    expect(site?.name).toBe("My portfolio");
    expect(site?.sections.find((s) => s.type === "about")?.content).toEqual({});
  });
});

describe("editing", () => {
  it("saves section content", async () => {
    expect(await saveSectionContent(db, "owner", siteId, "about", { body: "Hello" })).toMatchObject(
      { status: "draft" },
    );
    const site = await getEditableSite(db, "owner", siteId);
    expect(site?.sections.find((s) => s.type === "about")?.content).toEqual({ body: "Hello" });
  });

  it("reorders only with an exact permutation of the site's sections", async () => {
    const order = [...defaultSectionsByKind.portfolio];
    [order[1], order[2]] = [order[2]!, order[1]!];
    expect(await reorderSections(db, "owner", siteId, order)).toBe(true);
    expect((await getEditableSite(db, "owner", siteId))?.sections.map((s) => s.type)).toEqual(
      order,
    );

    expect(await reorderSections(db, "owner", siteId, order.slice(1))).toBe(false); // missing one
    expect(await reorderSections(db, "owner", siteId, [...order.slice(1), "hero", "hero"])).toBe(
      false,
    ); // dup
    expect(await reorderSections(db, "owner", siteId, [...order.slice(0, -1), "gallery"])).toBe(
      false,
    ); // foreign
  });

  it("adds a missing section at the end, once", async () => {
    expect(await addSection(db, "owner", siteId, "gallery")).toBe(true);
    expect(await addSection(db, "owner", siteId, "gallery")).toBe(false);
    expect((await getEditableSite(db, "owner", siteId))?.sections.at(-1)?.type).toBe("gallery");
  });
});

describe("slugs", () => {
  it("validates shape and reserved words without the DB", () => {
    expect(checkSlugShape("jane-doe")).toBeNull();
    expect(checkSlugShape("Jane")).toBe("format");
    expect(checkSlugShape("ab")).toBe("format");
    expect(checkSlugShape("a--b")).toBe("format");
    expect(checkSlugShape("dashboard")).toBe("reserved");
    expect(checkSlugShape("demo")).toBe("reserved");
    expect(checkSlugShape("draft-abc")).toBe("reserved");
  });

  it("slugifies names", () => {
    expect(slugify("Jane Doe's Studio!")).toBe("jane-does-studio");
    expect(slugify("  Café Ñandú  ")).toBe("cafe-nandu");
  });

  it("reports taken slugs, except the site's own", async () => {
    const other = await createDraftSite(db, "intruder", {
      name: "Other",
      kind: "business",
      template: "minimal-mono",
    });
    expect(await publishSite(db, "intruder", other, "jane-doe")).toMatchObject({ ok: true });
    expect(await checkSlugAvailability(db, "jane-doe", siteId)).toBe("taken");
    expect(await checkSlugAvailability(db, "jane-doe", other)).toBeNull();
    expect(await checkSlugAvailability(db, "free-name", siteId)).toBeNull();
  });
});

describe("publishSite", () => {
  it("refuses taken, reserved and malformed slugs", async () => {
    expect(await publishSite(db, "owner", siteId, "jane-doe")).toEqual({
      ok: false,
      problem: "taken",
    });
    expect(await publishSite(db, "owner", siteId, "admin")).toEqual({
      ok: false,
      problem: "reserved",
    });
    expect(await publishSite(db, "owner", siteId, "Bad Slug")).toEqual({
      ok: false,
      problem: "format",
    });
    expect((await getEditableSite(db, "owner", siteId))?.status).toBe("draft");
  });

  it("publishes with the chosen address and becomes publicly visible", async () => {
    const before = (await getEditableSite(db, "owner", siteId))!.slug;
    expect(await publishSite(db, "owner", siteId, "my-portfolio")).toEqual({
      ok: true,
      slug: "my-portfolio",
      previousSlug: before,
    });
    const live = await getPublishedSiteBySlug(db, "my-portfolio");
    expect(live?.site.id).toBe(siteId);
    expect(await getPublishedSiteBySlug(db, before)).toBeNull();
  });
});
