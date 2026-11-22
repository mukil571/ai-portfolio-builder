import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { draftSystemPrompt } from "@/lib/ai/prompts";
import { toCsv } from "@/lib/csv";
import { encryptApiKey } from "@/lib/crypto/api-keys";
import { deleteAccount, exportAccountData } from "@/lib/db/queries/account";
import { storeApiKey } from "@/lib/db/queries/ai-settings";
import { createNotifyLead, getOrCreateConversation, saveExchange } from "@/lib/db/queries/chat";
import { createApprovedFact } from "@/lib/db/queries/knowledge";
import { createDraftSite, publishSite, saveSectionContent } from "@/lib/db/queries/site-builder";
import {
  deleteSite,
  findFactConflicts,
  getAnalytics,
  getOverview,
  getTranscript,
  listConversations,
  listLeads,
  recordVisit,
  unpublishSite,
} from "@/lib/db/queries/workspace";
import { sites, unansweredQuestions, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { indexFact } from "@/lib/knowledge/indexing";

import { fakeEmbedder } from "../helpers/fake-embedder";
import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;
let site: string;
let conv: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "ana", name: "Ana", email: "ana@example.com", emailVerified: true },
    { id: "ben", name: "Ben", email: "ben@example.com", emailVerified: true },
  ]);
  site = await createDraftSite(db, "ana", { name: "Ana", kind: "portfolio", template: "bento" });
  await saveSectionContent(db, "ana", site, "hero", { name: "Ana" });
  await publishSite(db, "ana", site, "ana-ws");

  conv = await getOrCreateConversation(db, {
    siteId: site,
    visitorId: "v1",
    ipHash: "h",
    userAgent: "ua",
  });
  const fact = (await createApprovedFact(db, "ana", site, {
    question: "What is your hourly rate?",
    answer: "My rate is $40 per hour.",
    visibility: "public",
    expiresAt: null,
  }))!;
  await saveExchange(db, conv, "What is your rate?", {
    content: "Ana charges $40 per hour.",
    intent: "owner_fact",
    factIds: [fact],
    unansweredQuestionId: null,
    provider: "google",
    model: "m",
  });
  const [q] = await db
    .insert(unansweredQuestions)
    .values({ siteId: site, question: "Do you work weekends?", askedCount: 3 })
    .returning();
  await saveExchange(db, conv, "Do you work weekends?", {
    content: "I don't have that yet.",
    intent: "owner_fact",
    factIds: [],
    unansweredQuestionId: q!.id,
    provider: null,
    model: null,
  });
  await createNotifyLead(db, {
    siteId: site,
    unansweredQuestionId: q!.id,
    email: "=cmd|evil@example.com",
    conversationId: conv,
  });
}, 60_000);

afterAll(async () => {
  await close();
});

describe("visits", () => {
  it("counts published sites only, per day", async () => {
    const now = new Date();
    expect(await recordVisit(db, "ana-ws", now)).toBe(true);
    expect(await recordVisit(db, "ana-ws", now)).toBe(true);
    expect(await recordVisit(db, "no-such-site", now)).toBe(false);
    const o = await getOverview(db, "ana", site, now);
    expect(o!.visits7).toBe(2);
    expect(o!.visitsByDay).toHaveLength(30);
    expect(o!.visitsByDay.at(-1)!.visits).toBe(2);
  });
});

describe("overview, conversations, leads, analytics", () => {
  it("summarises the last 30 days and is owner-scoped", async () => {
    const o = await getOverview(db, "ana", site);
    expect(o).toMatchObject({
      chats30: 1,
      openQuestions: 1,
      leads30: 1,
      outcomes30: { answered: 1, escalated: 1 },
    });
    expect(await getOverview(db, "ben", site)).toBeNull();
  });

  it("lists conversations with their first message and full transcript", async () => {
    const list = await listConversations(db, "ana", site);
    expect(list).toHaveLength(1);
    expect(list![0]!.firstMessage).toBe("What is your rate?");
    const t = await getTranscript(db, "ana", site, conv);
    expect(t!.messages.map((m) => m.role)).toEqual([
      "visitor",
      "assistant",
      "visitor",
      "assistant",
    ]);
    expect(t!.messages[1]).toMatchObject({ answered: true, escalated: false });
    expect(t!.messages[3]).toMatchObject({ answered: false, escalated: true });
    expect(await listConversations(db, "ben", site)).toBeNull();
    expect(await getTranscript(db, "ben", site, conv)).toBeNull();
  });

  it("lists leads; CSV neutralises spreadsheet formulas", async () => {
    const rows = await listLeads(db, "ana", site);
    expect(rows![0]).toMatchObject({ question: "Do you work weekends?", purpose: "notify_answer" });
    expect(await listLeads(db, "ben", site)).toBeNull();
    const csv = toCsv([["email"], [rows![0]!.email], ['say "hi", ok']]);
    expect(csv).toBe(`email\r\n'=cmd|evil@example.com\r\n"say ""hi"", ok"\r\n`);
  });

  it("reports outcomes, gaps and most-used facts", async () => {
    const a = await getAnalytics(db, "ana", site);
    expect(a!.outcomes).toMatchObject({ answered: 1, escalated: 1 });
    expect(a!.coverage).toBe(0.5);
    expect(a!.topQuestions[0]).toMatchObject({ question: "Do you work weekends?", askedCount: 3 });
    expect(a!.topFacts[0]).toMatchObject({ question: "What is your hourly rate?", uses: 1 });
    expect(await getAnalytics(db, "ben", site)).toBeNull();
  });
});

describe("fact conflicts", () => {
  it("flags similar facts with different numbers, not unrelated or agreeing ones", async () => {
    const add = async (question: string, answer: string) => {
      const id = (await createApprovedFact(db, "ana", site, {
        question,
        answer,
        visibility: "public",
        expiresAt: null,
      }))!;
      await indexFact(db, id, fakeEmbedder);
      return id;
    };
    // Already exists (unindexed): "What is your hourly rate?" / $40. Index the pair we test.
    await add("What is your hourly rate for projects?", "My hourly rate for projects is $55.");
    await add(
      "What is your hourly rate for projects please?",
      "My hourly rate for projects is $55.",
    );
    await add("Where are you based?", "Lisbon, Portugal.");
    const conflicts = await findFactConflicts(db, "ana", site);
    expect(conflicts).toEqual([]); // same numbers => no conflict
    await add("What is your hourly rate for projects?", "My hourly rate for projects is $70.");
    const after = await findFactConflicts(db, "ana", site);
    expect(after!.length).toBeGreaterThan(0);
    expect(after!.some((c) => [c.a.answer, c.b.answer].some((t) => t.includes("$70")))).toBe(true);
    expect(await findFactConflicts(db, "ben", site)).toBeNull();
  });
});

describe("tone", () => {
  it("only adds a style line; the rules are unchanged", () => {
    const base = draftSystemPrompt("Ana");
    expect(draftSystemPrompt("Ana", "friendly")).toBe(base);
    const pro = draftSystemPrompt("Ana", "professional");
    expect(pro).toContain("Style: polite and professional");
    expect(pro.replace(/\n- Style:[^\n]*/, "")).toBe(base);
  });
});

describe("unpublish, delete, export, delete account", () => {
  it("unpublishes and is owner-scoped", async () => {
    expect(await unpublishSite(db, "ben", site)).toBeNull();
    expect(await unpublishSite(db, "ana", site)).toEqual({ slug: "ana-ws" });
    expect(await recordVisit(db, "ana-ws")).toBe(false);
    await publishSite(db, "ana", site, "ana-ws");
  });

  it("exports everything without secrets", async () => {
    await storeApiKey(db, "ana", site, {
      provider: "openai",
      model: "gpt-5.4-mini",
      ...encryptApiKey("sk-secret-value-0000wxyz", site, randomBytes(32)),
    });
    const data = await exportAccountData(db, "ana");
    const json = JSON.stringify(data);
    expect(data!.sites[0]!.conversations[0]!.messages).toHaveLength(4);
    expect(data!.sites[0]!.visitorEmails).toHaveLength(1);
    expect(data!.sites[0]!.aiSettings).toMatchObject({ apiKeyLast4: "wxyz" });
    expect(json).not.toContain("sk-secret");
    expect(json).not.toContain("encryptedApiKey");
    expect(json).not.toContain("embedding");
    expect(await exportAccountData(db, "nobody")).toBeNull();
  });

  it("deletes a site, then the whole account", async () => {
    const other = await createDraftSite(db, "ana", {
      name: "Two",
      kind: "business",
      template: "studio",
    });
    expect(await deleteSite(db, "ben", other)).toBeNull();
    expect(await deleteSite(db, "ana", other)).not.toBeNull();
    expect(await db.select().from(sites).where(eq(sites.id, other))).toHaveLength(0);

    expect(await deleteAccount(db, "ana")).toEqual(["ana-ws"]);
    expect(await db.select().from(sites).where(eq(sites.ownerId, "ana"))).toHaveLength(0);
    expect(await db.select().from(users).where(eq(users.id, "ana"))).toHaveLength(0);
    expect(await db.select().from(users).where(eq(users.id, "ben"))).toHaveLength(1);
  });
});
