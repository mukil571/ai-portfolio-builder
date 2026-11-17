import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPublishedSiteBySlug, getSiteForOwner } from "@/lib/db/queries/sites";
import { sites, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { seedDemoSites, type QueryFn } from "@/lib/sites/seed-demo";
import { planSections } from "@/lib/sites/render-plan";

import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let client: PGlite;
let close: () => Promise<void>;
let query: QueryFn;

beforeAll(async () => {
  ({ db, client, close } = await createTestDb());
  query = ((sql: string, params?: unknown[]) => client.query(sql, params)) as QueryFn;
  await db.insert(users).values([
    { id: "owner", name: "Owner", email: "Owner@Example.com", emailVerified: true },
    { id: "other", name: "Other", email: "other@example.com", emailVerified: true },
  ]);
}, 60_000);

afterAll(async () => {
  await close();
});

describe("seedDemoSites", () => {
  it("skips when no account matches", async () => {
    expect(await seedDemoSites(query, "nobody@example.com")).toEqual([
      "No account with SEED_OWNER_EMAIL; sign up first. Skipping.",
    ]);
  });

  it("creates a published demo and a draft, owned by the account (case-insensitive email)", async () => {
    expect(await seedDemoSites(query, "  owner@example.COM ")).toEqual([
      "created /site/demo (published).",
      "created /site/demo-draft (draft).",
    ]);

    const demo = await getPublishedSiteBySlug(db, "demo");
    expect(demo?.site.status).toBe("published");
    expect(planSections(demo!.sections).map((s) => s.type)).toContain("projects");
    expect(planSections(demo!.sections).map((s) => s.type)).not.toContain("gallery");

    expect(await getPublishedSiteBySlug(db, "demo-draft")).toBeNull();
  });

  it("is idempotent: re-running refreshes instead of duplicating", async () => {
    expect(await seedDemoSites(query, "owner@example.com")).toEqual([
      "refreshed /site/demo (published).",
      "refreshed /site/demo-draft (draft).",
    ]);
    const all = await db.select({ slug: sites.slug }).from(sites);
    expect(all.map((s) => s.slug).sort()).toEqual(["demo", "demo-draft"]);

    const [draft] = await db.select({ id: sites.id }).from(sites).where(eqSlug("demo-draft"));
    const owned = await getSiteForOwner(db, "owner", draft!.id);
    expect(owned?.sections).toHaveLength(13);
  });

  it("never takes over a slug owned by another account", async () => {
    expect(await seedDemoSites(query, "other@example.com")).toEqual([
      "/site/demo belongs to another account; leaving it alone.",
      "/site/demo-draft belongs to another account; leaving it alone.",
    ]);
  });
});

function eqSlug(slug: string) {
  return eq(sites.slug, slug);
}
