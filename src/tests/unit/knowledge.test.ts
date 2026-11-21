import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createApprovedFact,
  createProposedFacts,
  deleteFact,
  listFacts,
  setFactStatus,
  updateFact,
} from "@/lib/db/queries/knowledge";
import { createDraftSite } from "@/lib/db/queries/site-builder";
import { knowledgeFacts, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { indexFact } from "@/lib/knowledge/indexing";
import { retrieveFacts, searchFacts } from "@/lib/knowledge/retrieval";

import { failingEmbedder, fakeEmbedder, fakeVector } from "../helpers/fake-embedder";
import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;
let siteA: string;
let siteB: string;

const fact = (question: string, answer: string) => ({
  question,
  answer,
  visibility: "public" as const,
  expiresAt: null,
});

async function addIndexed(owner: string, site: string, q: string, a: string) {
  const id = (await createApprovedFact(db, owner, site, fact(q, a)))!;
  expect(await indexFact(db, id, fakeEmbedder)).toBe(true);
  return id;
}

const ask = (site: string, question: string, k = 5) =>
  searchFacts(db, site, question, fakeEmbedder, k);

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "alice", name: "Alice", email: "alice@example.com", emailVerified: true },
    { id: "bob", name: "Bob", email: "bob@example.com", emailVerified: true },
  ]);
  siteA = await createDraftSite(db, "alice", {
    name: "A",
    kind: "portfolio",
    template: "minimal-mono",
  });
  siteB = await createDraftSite(db, "bob", {
    name: "B",
    kind: "business",
    template: "minimal-mono",
  });

  await addIndexed("alice", siteA, "What is your hourly rate?", "My hourly rate is 85 dollars.");
  await addIndexed("alice", siteA, "Are you available for new projects?", "Available from March.");
  await addIndexed("alice", siteA, "Which frameworks do you use?", "React and Next.js mostly.");
  await addIndexed("bob", siteB, "What is your hourly rate?", "Bob charges 200 dollars per hour.");
}, 60_000);

afterAll(async () => {
  await close();
});

describe("retrieval ranking", () => {
  it("ranks the most similar fact first with a higher score", async () => {
    const results = await ask(siteA, "what is your hourly rate");
    expect(results[0]?.answer).toBe("My hourly rate is 85 dollars.");
    const scores = results.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
  });

  it("respects k", async () => {
    expect(await ask(siteA, "rate available react", 2)).toHaveLength(2);
  });
});

describe("tenant isolation", () => {
  it("site A never retrieves site B's facts, even for an identical question", async () => {
    const forA = await ask(siteA, "what is your hourly rate", 20);
    expect(forA.some((r) => r.answer.includes("Bob"))).toBe(false);
    const forB = await ask(siteB, "what is your hourly rate", 20);
    expect(forB.map((r) => r.answer)).toEqual(["Bob charges 200 dollars per hour."]);
  });

  it("owners can't list, edit, approve or delete another owner's facts", async () => {
    expect(await listFacts(db, "bob", siteA)).toBeNull();
    const [aliceFact] = (await listFacts(db, "alice", siteA))!;
    expect(await updateFact(db, "bob", aliceFact!.id, fact("x", "hacked"))).toBeNull();
    expect(await setFactStatus(db, "bob", aliceFact!.id, "rejected")).toBe(false);
    expect(await deleteFact(db, "bob", aliceFact!.id)).toBe(false);
    expect(await createApprovedFact(db, "bob", siteA, fact("Injected?", "yes"))).toBeNull();
    expect(
      await createProposedFacts(db, "bob", siteA, [{ question: "q", answer: "a" }], "manual"),
    ).toBeNull();
  });
});

describe("Golden Rule gate: only approved, public, current facts are retrievable", () => {
  it("never retrieves proposed facts until approved", async () => {
    await createProposedFacts(
      db,
      "alice",
      siteA,
      [{ question: "Do you offer refunds?", answer: "Full refunds within 30 days." }],
      "resume",
    );
    expect(
      (await ask(siteA, "do you offer refunds", 20)).some((r) => r.answer.includes("refunds")),
    ).toBe(false);

    const proposed = (await listFacts(db, "alice", siteA))!.find(
      (f) => f.question === "Do you offer refunds?",
    )!;
    expect(proposed.status).toBe("proposed");
    expect(await setFactStatus(db, "alice", proposed.id, "approved")).toBe(true);
    expect(await indexFact(db, proposed.id, fakeEmbedder)).toBe(true);
    expect((await ask(siteA, "do you offer refunds"))[0]?.answer).toBe(
      "Full refunds within 30 days.",
    );
  });

  it("drops rejected facts", async () => {
    const id = await addIndexed("alice", siteA, "Do you work weekends?", "Yes, on weekends.");
    await setFactStatus(db, "alice", id, "rejected");
    expect((await ask(siteA, "do you work weekends", 20)).some((r) => r.id === id)).toBe(false);
  });

  it("excludes private and expired facts", async () => {
    const priv = (await createApprovedFact(db, "alice", siteA, {
      ...fact("Secret discount code?", "SAVE50"),
      visibility: "private",
    }))!;
    await indexFact(db, priv, fakeEmbedder);
    const expired = (await createApprovedFact(db, "alice", siteA, {
      ...fact("Summer promo price?", "50 dollars"),
      expiresAt: new Date(Date.now() - 1000),
    }))!;
    await indexFact(db, expired, fakeEmbedder);
    const ids = (await ask(siteA, "secret discount code summer promo price", 20)).map((r) => r.id);
    expect(ids).not.toContain(priv);
    expect(ids).not.toContain(expired);
  });

  it("ignores vectors from a different embedding model", async () => {
    const id = await addIndexed("alice", siteA, "Favourite colour?", "Blue.");
    await db
      .update(knowledgeFacts)
      .set({ embeddingModel: "old-model" })
      .where(eq(knowledgeFacts.id, id));
    expect(
      (await retrieveFacts(db, siteA, fakeVector("favourite colour"), { k: 20 })).some(
        (r) => r.id === id,
      ),
    ).toBe(false);
  });

  it("an approved fact whose embedding failed stays unsearchable", async () => {
    const id = (await createApprovedFact(db, "alice", siteA, fact("Do you sign NDAs?", "Yes.")))!;
    expect(await indexFact(db, id, failingEmbedder)).toBe(false);
    expect((await ask(siteA, "do you sign ndas", 20)).some((r) => r.id === id)).toBe(false);
    expect((await listFacts(db, "alice", siteA))!.find((f) => f.id === id)?.searchable).toBe(false);
  });
});

describe("adding / editing / deleting a fact updates retrieval", () => {
  it("adding makes it retrievable", async () => {
    await addIndexed("alice", siteA, "Where are you based?", "Lisbon, Portugal.");
    expect((await ask(siteA, "where are you based"))[0]?.answer).toBe("Lisbon, Portugal.");
  });

  it("editing replaces the old answer (stale vector dropped until re-indexed)", async () => {
    const id = (await listFacts(db, "alice", siteA))!.find(
      (f) => f.question === "Where are you based?",
    )!.id;
    await updateFact(db, "alice", id, fact("Where are you based?", "Porto, Portugal."));
    expect((await ask(siteA, "where are you based", 20)).some((r) => r.id === id)).toBe(false);
    await indexFact(db, id, fakeEmbedder);
    expect((await ask(siteA, "where are you based"))[0]?.answer).toBe("Porto, Portugal.");
  });

  it("deleting removes it", async () => {
    const id = (await listFacts(db, "alice", siteA))!.find(
      (f) => f.question === "Where are you based?",
    )!.id;
    expect(await deleteFact(db, "alice", id)).toBe(true);
    expect((await ask(siteA, "where are you based", 20)).some((r) => r.id === id)).toBe(false);
  });
});

describe("proposed facts", () => {
  it("skips duplicates of existing questions (case-insensitive)", async () => {
    const added = await createProposedFacts(
      db,
      "alice",
      siteA,
      [
        { question: "what is your HOURLY rate?", answer: "dup" },
        { question: "Do you travel?", answer: "Within Europe." },
        { question: "Do you travel?", answer: "dup in batch" },
      ],
      "resume",
    );
    expect(added).toBe(1);
  });
});
