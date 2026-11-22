import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { chooseChatModel } from "@/lib/ai/chat-model";
import { testApiKey } from "@/lib/ai/providers";
import { decryptApiKey, encryptApiKey, parseEncryptionSecret } from "@/lib/crypto/api-keys";
import {
  deleteApiKey,
  getChatAiConfig,
  getOwnerAiSettings,
  setAiMode,
  storeApiKey,
} from "@/lib/db/queries/ai-settings";
import { getAssistantSettings, setAssistant } from "@/lib/db/queries/chat";
import { createDraftSite, publishSite, saveSectionContent } from "@/lib/db/queries/site-builder";
import { aiSettings, usageLogs, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { changePlan, getPlanStatus, recordChatUsage } from "@/lib/plans/usage";

import { createTestDb } from "../helpers/test-db";

// A fake but realistic-looking key. Every test checks it never leaks.
const KEY = "sk-test-0123456789abcdefSECRETwxyz";
const secret = randomBytes(32);
const SITE = "11111111-1111-4111-8111-111111111111";

/** Captures every console call so we can prove the key never reaches the logs. */
const logged: string[] = [];
beforeAll(() => {
  for (const level of ["log", "info", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((...args) => {
      logged.push(JSON.stringify(args));
    });
  }
});
afterEach(() => {
  expect(logged.join("\n")).not.toContain(KEY);
  expect(logged.join("\n")).not.toContain("SECRET");
});

describe("API key encryption", () => {
  it("round-trips and keeps only the last 4 in clear", () => {
    const enc = encryptApiKey(KEY, SITE, secret);
    expect(enc.ciphertext).not.toContain(KEY);
    expect(enc.ciphertext).not.toContain("SECRET");
    expect(enc.last4).toBe("wxyz");
    expect(decryptApiKey(enc.ciphertext, enc.keyVersion, SITE, secret)).toBe(KEY);
  });

  it("uses a fresh IV every time", () => {
    expect(encryptApiKey(KEY, SITE, secret).ciphertext).not.toBe(
      encryptApiKey(KEY, SITE, secret).ciphertext,
    );
  });

  it("refuses another site's ciphertext, tampering and the wrong secret", () => {
    const enc = encryptApiKey(KEY, SITE, secret);
    const other = "22222222-2222-4222-8222-222222222222";
    expect(() => decryptApiKey(enc.ciphertext, 1, other, secret)).toThrow();
    const [iv, tag, data] = enc.ciphertext.split(".");
    const flipped = `${iv}.${tag}.${data!.slice(0, -2)}AA`;
    expect(() => decryptApiKey(flipped, 1, SITE, secret)).toThrow();
    expect(() => decryptApiKey(enc.ciphertext, 1, SITE, randomBytes(32))).toThrow();
    expect(() => decryptApiKey(enc.ciphertext, 2, SITE, secret)).toThrow();
  });

  it("requires a 32-byte secret", () => {
    expect(() => parseEncryptionSecret(undefined)).toThrow();
    expect(() => parseEncryptionSecret(Buffer.alloc(16).toString("base64"))).toThrow();
    expect(parseEncryptionSecret(secret.toString("base64"))).toHaveLength(32);
  });
});

describe("testApiKey", () => {
  it("maps provider errors to categories without echoing the message", async () => {
    const failWith = (statusCode: number) =>
      vi.fn(async () => {
        throw Object.assign(new Error(`bad key ${KEY}`), { statusCode });
      });
    expect(await testApiKey("openai", "gpt-5.4-mini", KEY, failWith(401) as never)).toEqual({
      ok: false,
      reason: "rejected",
    });
    expect(await testApiKey("openai", "gpt-5.4-mini", KEY, failWith(404) as never)).toEqual({
      ok: false,
      reason: "model",
    });
    expect(await testApiKey("openai", "gpt-5.4-mini", KEY, failWith(429) as never)).toEqual({
      ok: false,
      reason: "limited",
    });
    expect(await testApiKey("openai", "gpt-5.4-mini", KEY, failWith(500) as never)).toEqual({
      ok: false,
      reason: "unreachable",
    });
    const googleBadKey = vi.fn(async () => {
      throw Object.assign(new Error("API key not valid. Please pass a valid API key."), {
        statusCode: 400,
      });
    });
    expect(await testApiKey("google", "gemini-3.5-flash", KEY, googleBadKey as never)).toEqual({
      ok: false,
      reason: "rejected",
    });
    const okGen = vi.fn(async () => ({ text: "OK" }));
    expect(await testApiKey("anthropic", "claude-haiku-5-5", KEY, okGen as never)).toEqual({
      ok: true,
    });
  });
});

describe("AI settings, plans and model choice (database)", () => {
  let db: AppDb;
  let close: () => Promise<void>;
  let site: string;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(users).values([
      { id: "ana", name: "Ana", email: "ana@example.com", emailVerified: true },
      { id: "ben", name: "Ben", email: "ben@example.com", emailVerified: true },
    ]);
    site = await createDraftSite(db, "ana", {
      name: "Ana",
      kind: "portfolio",
      template: "minimal-mono",
    });
    await saveSectionContent(db, "ana", site, "hero", { name: "Ana" });
    await publishSite(db, "ana", site, "ana-ai");
  }, 60_000);

  afterAll(async () => {
    await close();
  });

  it("own-key mode needs a saved key; owner view never includes the key", async () => {
    expect(await setAiMode(db, "ana", site, { mode: "byok", allowGeneralAnswers: false })).toEqual({
      ok: false,
      problem: "no_key",
    });
    expect(
      await storeApiKey(db, "ben", site, {
        provider: "openai",
        model: "gpt-5.4-mini",
        ...encryptApiKey(KEY, site, secret),
      }),
    ).toBeNull();
    await storeApiKey(db, "ana", site, {
      provider: "openai",
      model: "gpt-5.4-mini",
      ...encryptApiKey(KEY, site, secret),
    });
    const view = await getOwnerAiSettings(db, "ana", site);
    expect(view).toEqual({
      mode: "byok",
      provider: "openai",
      model: "gpt-5.4-mini",
      keyLast4: "wxyz",
      allowGeneralAnswers: false,
    });
    expect(JSON.stringify(view)).not.toContain("SECRET");
    expect(await getOwnerAiSettings(db, "ben", site)).toBeNull();
  });

  it("the chat uses the owner's key, unmetered", async () => {
    const config = (await getChatAiConfig(db, site))!;
    const choice = await chooseChatModel(config, site, {
      platformKey: "platform",
      encryptionSecret: () => secret,
      planStatus: async () => {
        throw new Error("byok must not check the plan");
      },
    });
    expect(choice).toEqual({
      kind: "ready",
      provider: "openai",
      model: "gpt-5.4-mini",
      apiKey: KEY,
      platformBilled: false,
    });
  });

  it("a key that can't be decrypted means 'not configured', never another key", async () => {
    const config = (await getChatAiConfig(db, site))!;
    const choice = await chooseChatModel(config, site, {
      platformKey: "platform",
      encryptionSecret: () => randomBytes(32),
      planStatus: () => getPlanStatus(db, "ana"),
    });
    expect(choice).toEqual({ kind: "not_configured" });
  });

  it("turning the assistant on prefers the saved key; deleting it turns chat off", async () => {
    await setAssistant(db, "ana", site, { enabled: false, allowGeneralAnswers: false });
    await setAssistant(db, "ana", site, { enabled: true, allowGeneralAnswers: false });
    expect((await getOwnerAiSettings(db, "ana", site))!.mode).toBe("byok");
    expect(await getAssistantSettings(db, "ana", site)).toMatchObject({ enabled: true });

    expect(await deleteApiKey(db, "ben", site)).toBeNull();
    await deleteApiKey(db, "ana", site);
    const [row] = await db.select().from(aiSettings).where(eq(aiSettings.siteId, site));
    expect(row).toMatchObject({
      mode: "none",
      encryptedApiKey: null,
      keyVersion: null,
      apiKeyLast4: null,
    });
  });

  it("platform mode is metered and stops at the plan limit", async () => {
    await setAiMode(db, "ana", site, { mode: "platform", allowGeneralAnswers: false });
    const config = (await getChatAiConfig(db, site))!;
    const deps = {
      platformKey: "platform-key",
      encryptionSecret: () => secret,
      planStatus: () => getPlanStatus(db, "ana"),
    };
    expect(await chooseChatModel(config, site, deps)).toMatchObject({
      kind: "ready",
      platformBilled: true,
    });

    // Free = 50 messages. Own-key usage never counts.
    const rows = Array.from({ length: 50 }, () => ({
      userId: "ana",
      siteId: site,
      kind: "chat_message" as const,
      platformBilled: true,
    }));
    await db.insert(usageLogs).values(rows);
    await recordChatUsage(db, {
      userId: "ana",
      siteId: site,
      platformBilled: false,
      provider: "openai",
      model: "gpt-5.4-mini",
    });
    expect(await getPlanStatus(db, "ana")).toMatchObject({ plan: "free", used: 50, limit: 50 });
    expect(await chooseChatModel(config, site, deps)).toEqual({ kind: "quota_exceeded" });

    // Simulated upgrade raises the limit immediately, keeping this period's usage.
    await changePlan(db, "ana", "starter");
    expect(await getPlanStatus(db, "ana")).toMatchObject({ plan: "starter", used: 50 });
    expect(await chooseChatModel(config, site, deps)).toMatchObject({ kind: "ready" });

    // No platform key on the server -> not configured.
    expect(await chooseChatModel(config, site, { ...deps, platformKey: undefined })).toEqual({
      kind: "not_configured",
    });
  });

  it("a new period resets the count", async () => {
    const later = new Date(Date.now() + 95 * 24 * 60 * 60 * 1000);
    const status = await getPlanStatus(db, "ana", later);
    expect(status.used).toBe(0);
    expect(status.periodStart.getTime()).toBeLessThanOrEqual(later.getTime());
    expect(status.periodEnd.getTime()).toBeGreaterThan(later.getTime());
  });

  it("creates a Free plan for users without one", async () => {
    expect(await getPlanStatus(db, "ben")).toMatchObject({ plan: "free", used: 0, limit: 50 });
  });
});
