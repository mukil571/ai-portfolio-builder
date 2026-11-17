import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPublishedSiteBySlug, getSiteForOwner } from "@/lib/db/queries/sites";
import { sites, siteSections, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;
let publishedId: string;
let draftId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true },
    { id: "intruder", name: "Intruder", email: "intruder@example.com", emailVerified: true },
  ]);
  const [pub, draft] = await db
    .insert(sites)
    .values([
      { ownerId: "owner", name: "Live", slug: "live-site", kind: "portfolio", status: "published" },
      { ownerId: "owner", name: "Draft", slug: "draft-site", kind: "portfolio", status: "draft" },
    ])
    .returning({ id: sites.id });
  publishedId = pub!.id;
  draftId = draft!.id;
  await db.insert(siteSections).values([
    { siteId: publishedId, type: "about", position: 1, content: { body: "About me" } },
    { siteId: publishedId, type: "hero", position: 0, content: { name: "Live" } },
    { siteId: draftId, type: "hero", position: 0, content: { name: "Secret draft" } },
  ]);
}, 60_000);

afterAll(async () => {
  await close();
});

describe("getPublishedSiteBySlug (public route)", () => {
  it("returns a published site with sections in position order", async () => {
    const result = await getPublishedSiteBySlug(db, "live-site");
    expect(result?.site.name).toBe("Live");
    expect(result?.sections.map((s) => s.type)).toEqual(["hero", "about"]);
  });

  it("never returns a draft (so drafts 404 publicly)", async () => {
    expect(await getPublishedSiteBySlug(db, "draft-site")).toBeNull();
  });

  it("returns null for unknown slugs", async () => {
    expect(await getPublishedSiteBySlug(db, "nope")).toBeNull();
  });
});

describe("getSiteForOwner (owner preview)", () => {
  it("lets the owner preview their draft", async () => {
    const result = await getSiteForOwner(db, "owner", draftId);
    expect(result?.site.status).toBe("draft");
    expect(result?.sections[0]?.content).toEqual({ name: "Secret draft" });
  });

  it("never returns another owner's site, draft or published", async () => {
    expect(await getSiteForOwner(db, "intruder", draftId)).toBeNull();
    expect(await getSiteForOwner(db, "intruder", publishedId)).toBeNull();
  });
});
