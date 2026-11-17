import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listSitesForOwner } from "@/lib/db/queries/sites";
import { sites, unansweredQuestions, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());

  await db.insert(users).values([
    { id: "user-a", name: "Alice", email: "alice@example.com", emailVerified: true },
    { id: "user-b", name: "Bob", email: "bob@example.com", emailVerified: true },
  ]);
  const [aOld, aNew, b] = await db
    .insert(sites)
    .values([
      { ownerId: "user-a", name: "Alice Portfolio", slug: "alice", kind: "portfolio" },
      {
        ownerId: "user-a",
        name: "Alice Studio",
        slug: "alice-studio",
        kind: "business",
        status: "published",
        updatedAt: new Date(Date.now() + 60_000),
      },
      { ownerId: "user-b", name: "Bob Portfolio", slug: "bob-site", kind: "portfolio" },
    ])
    .returning({ id: sites.id });

  await db.insert(unansweredQuestions).values([
    { siteId: aOld!.id, question: "Rate?", status: "open" },
    { siteId: aOld!.id, question: "Available in May?", status: "open" },
    { siteId: aOld!.id, question: "Old one", status: "answered" },
    { siteId: aNew!.id, question: "Do you ship abroad?", status: "ignored" },
    // Bob's questions must never be counted on Alice's sites.
    { siteId: b!.id, question: "Bob q1", status: "open" },
    { siteId: b!.id, question: "Bob q2", status: "open" },
    { siteId: b!.id, question: "Bob q3", status: "open" },
  ]);
}, 60_000);

afterAll(async () => {
  await close();
});

describe("listSitesForOwner (ownership scoping)", () => {
  it("returns only the owner's sites, newest first", async () => {
    const result = await listSitesForOwner(db, "user-a");
    expect(result.map((s) => s.slug)).toEqual(["alice-studio", "alice"]);
  });

  it("never returns another owner's sites", async () => {
    const forA = await listSitesForOwner(db, "user-a");
    const forB = await listSitesForOwner(db, "user-b");
    expect(forA.some((s) => s.slug === "bob-site")).toBe(false);
    expect(forB.map((s) => s.slug)).toEqual(["bob-site"]);
  });

  it("counts only open questions belonging to each site", async () => {
    const bySlug = Object.fromEntries(
      (await listSitesForOwner(db, "user-a")).map((s) => [s.slug, s.openQuestions]),
    );
    expect(bySlug).toEqual({ alice: 2, "alice-studio": 0 });
    expect((await listSitesForOwner(db, "user-b"))[0]?.openQuestions).toBe(3);
  });

  it("returns an empty list for an unknown or empty owner id", async () => {
    expect(await listSitesForOwner(db, "nobody")).toEqual([]);
    expect(await listSitesForOwner(db, "")).toEqual([]);
  });
});
