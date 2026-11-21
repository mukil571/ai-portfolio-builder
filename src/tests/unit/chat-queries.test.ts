import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  countRecentByIp,
  countRecentBySite,
  createNotifyLead,
  getAssistantSettings,
  getChatSite,
  getOrCreateConversation,
  saveExchange,
  setAssistant,
} from "@/lib/db/queries/chat";
import { createDraftSite, publishSite, saveSectionContent } from "@/lib/db/queries/site-builder";
import { leads, unansweredQuestions, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

import { createTestDb } from "../helpers/test-db";

let db: AppDb;
let close: () => Promise<void>;
let siteA: string;
let siteB: string;
let questionB: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "ana", name: "Ana", email: "ana@example.com", emailVerified: true },
    { id: "ben", name: "Ben", email: "ben@example.com", emailVerified: true },
  ]);
  siteA = await createDraftSite(db, "ana", {
    name: "Ana's site",
    kind: "portfolio",
    template: "minimal-mono",
  });
  siteB = await createDraftSite(db, "ben", {
    name: "Ben's site",
    kind: "business",
    template: "minimal-mono",
  });
  await saveSectionContent(db, "ana", siteA, "hero", { name: "Ana Silva" });
  await publishSite(db, "ana", siteA, "ana-silva");
  const [q] = await db
    .insert(unansweredQuestions)
    .values({ siteId: siteB, question: "Refunds?" })
    .returning();
  questionB = q!.id;
}, 60_000);

afterAll(async () => {
  await close();
});

describe("getChatSite", () => {
  it("serves published sites with the hero name and AI off by default", async () => {
    expect(await getChatSite(db, "ana-silva")).toMatchObject({
      siteId: siteA,
      owner: "Ana Silva",
      mode: "none",
      allowGeneralAnswers: false,
    });
  });

  it("never serves drafts or unknown slugs", async () => {
    const draftSlug = (await db.query.sites.findFirst({ where: (s, { eq }) => eq(s.id, siteB) }))!
      .slug;
    expect(await getChatSite(db, draftSlug)).toBeNull();
    expect(await getChatSite(db, "nope")).toBeNull();
  });
});

describe("assistant switch (owner-scoped)", () => {
  it("only the owner can enable it", async () => {
    expect(
      await setAssistant(db, "ben", siteA, { enabled: true, allowGeneralAnswers: true }),
    ).toBeNull();
    expect((await getChatSite(db, "ana-silva"))?.mode).toBe("none");
    expect(await getAssistantSettings(db, "ben", siteA)).toBeNull();

    expect(
      await setAssistant(db, "ana", siteA, { enabled: true, allowGeneralAnswers: false }),
    ).toEqual({
      slug: "ana-silva",
    });
    expect(await getChatSite(db, "ana-silva")).toMatchObject({
      mode: "platform",
      allowGeneralAnswers: false,
    });
    expect(await getAssistantSettings(db, "ana", siteA)).toEqual({
      enabled: true,
      allowGeneralAnswers: false,
    });
  });
});

describe("conversations, messages and rate-limit counts", () => {
  it("reuses only the visitor's own conversation on the same site", async () => {
    const base = { siteId: siteA, ipHash: "iphash1", userAgent: null };
    const c1 = await getOrCreateConversation(db, { ...base, visitorId: "v1" });
    expect(
      await getOrCreateConversation(db, { ...base, visitorId: "v1", conversationId: c1 }),
    ).toBe(c1);
    // Another visitor (or site) can't hijack it.
    expect(
      await getOrCreateConversation(db, { ...base, visitorId: "v2", conversationId: c1 }),
    ).not.toBe(c1);
    expect(
      await getOrCreateConversation(db, {
        ...base,
        siteId: siteB,
        visitorId: "v1",
        conversationId: c1,
      }),
    ).not.toBe(c1);
  });

  it("counts recent visitor messages per IP and per site", async () => {
    const conv = await getOrCreateConversation(db, {
      siteId: siteA,
      visitorId: "v9",
      ipHash: "iphash9",
      userAgent: null,
    });
    const reply = {
      content: "hi",
      intent: null,
      factIds: [],
      unansweredQuestionId: null,
      provider: null,
      model: null,
    };
    await saveExchange(db, conv, "q1", reply);
    await saveExchange(db, conv, "q2", reply);
    const since = new Date(Date.now() - 60_000);
    expect(await countRecentByIp(db, "iphash9", since)).toBe(2);
    expect(await countRecentBySite(db, siteA, since)).toBeGreaterThanOrEqual(2);
    expect(await countRecentBySite(db, siteB, since)).toBe(0);
  });
});

describe("createNotifyLead", () => {
  it("refuses a question that belongs to another site", async () => {
    expect(
      await createNotifyLead(db, {
        siteId: siteA,
        unansweredQuestionId: questionB,
        email: "x@example.com",
        conversationId: null,
      }),
    ).toBe(false);
    expect(await db.select().from(leads)).toHaveLength(0);
  });

  it("records once per email and question", async () => {
    const [q] = await db
      .insert(unansweredQuestions)
      .values({ siteId: siteA, question: "NDA?" })
      .returning();
    const input = {
      siteId: siteA,
      unansweredQuestionId: q!.id,
      email: "v@example.com",
      conversationId: null,
    };
    expect(await createNotifyLead(db, input)).toBe(true);
    expect(await createNotifyLead(db, input)).toBe(true);
    expect(await db.select().from(leads)).toHaveLength(1);
  });
});
