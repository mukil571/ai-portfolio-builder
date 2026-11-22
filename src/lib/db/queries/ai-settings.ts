import { and, eq } from "drizzle-orm";

import type { ProviderId } from "@/lib/ai/model-catalog";

import { aiSettings, sites } from "../schema";
import type { AppDb } from "../types";

/*
 * AI & API settings. Owner functions are scoped by owner id; the encrypted key is only
 * ever read by getChatAiConfig (server-side chat) and never returned to the dashboard.
 */

export type AiMode = "none" | "byok" | "platform";

export type OwnerAiSettings = {
  mode: AiMode;
  provider: ProviderId | null;
  model: string | null;
  /** Last 4 characters of the saved key, or null if none. Never the key itself. */
  keyLast4: string | null;
  allowGeneralAnswers: boolean;
};

async function ownedSiteId(db: AppDb, ownerId: string, siteId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  return Boolean(row);
}

export async function getOwnerAiSettings(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<OwnerAiSettings | null> {
  const [row] = await db
    .select({
      mode: aiSettings.mode,
      provider: aiSettings.provider,
      model: aiSettings.model,
      keyLast4: aiSettings.apiKeyLast4,
      allowGeneralAnswers: aiSettings.allowGeneralAnswers,
    })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!row) return null;
  return {
    mode: row.mode ?? "none",
    provider: row.provider ?? null,
    model: row.model ?? null,
    keyLast4: row.keyLast4 ?? null,
    allowGeneralAnswers: row.allowGeneralAnswers ?? false,
  };
}

/**
 * Sets how the assistant is powered. "byok" requires a saved key (returns "no_key"
 * otherwise). Returns the site's slug for cache revalidation.
 */
export async function setAiMode(
  db: AppDb,
  ownerId: string,
  siteId: string,
  input: { mode: AiMode; allowGeneralAnswers: boolean },
): Promise<{ ok: true; slug: string } | { ok: false; problem: "not_found" | "no_key" }> {
  const [site] = await db
    .select({ slug: sites.slug, keyLast4: aiSettings.apiKeyLast4 })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!site) return { ok: false, problem: "not_found" };
  if (input.mode === "byok" && !site.keyLast4) return { ok: false, problem: "no_key" };
  await db
    .insert(aiSettings)
    .values({ siteId, mode: input.mode, allowGeneralAnswers: input.allowGeneralAnswers })
    .onConflictDoUpdate({
      target: aiSettings.siteId,
      set: { mode: input.mode, allowGeneralAnswers: input.allowGeneralAnswers },
    });
  return { ok: true, slug: site.slug };
}

/** Saves an (already encrypted) owner key with its provider/model and switches to byok. */
export async function storeApiKey(
  db: AppDb,
  ownerId: string,
  siteId: string,
  key: {
    provider: ProviderId;
    model: string;
    ciphertext: string;
    keyVersion: number;
    last4: string;
  },
): Promise<{ slug: string } | null> {
  if (!(await ownedSiteId(db, ownerId, siteId))) return null;
  const values = {
    mode: "byok" as const,
    provider: key.provider,
    model: key.model,
    encryptedApiKey: key.ciphertext,
    keyVersion: key.keyVersion,
    apiKeyLast4: key.last4,
  };
  await db
    .insert(aiSettings)
    .values({ siteId, ...values })
    .onConflictDoUpdate({ target: aiSettings.siteId, set: values });
  const [site] = await db.select({ slug: sites.slug }).from(sites).where(eq(sites.id, siteId));
  return { slug: site!.slug };
}

/** Changes the model used with the saved key (same provider). */
export async function setByokModel(
  db: AppDb,
  ownerId: string,
  siteId: string,
  model: string,
): Promise<boolean> {
  if (!(await ownedSiteId(db, ownerId, siteId))) return false;
  const rows = await db
    .update(aiSettings)
    .set({ model })
    .where(eq(aiSettings.siteId, siteId))
    .returning({ id: aiSettings.siteId });
  return rows.length > 0;
}

/** Deletes the saved key; a site that was using it falls back to "off". */
export async function deleteApiKey(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<{ slug: string } | null> {
  const [site] = await db
    .select({ slug: sites.slug, mode: aiSettings.mode })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!site) return null;
  await db
    .update(aiSettings)
    .set({
      encryptedApiKey: null,
      keyVersion: null,
      apiKeyLast4: null,
      provider: null,
      model: null,
      ...(site.mode === "byok" ? { mode: "none" as const } : {}),
    })
    .where(eq(aiSettings.siteId, siteId));
  return { slug: site.slug };
}

export type ChatAiConfig = {
  ownerId: string;
  mode: AiMode;
  provider: ProviderId | null;
  model: string | null;
  encryptedApiKey: string | null;
  keyVersion: number | null;
};

/** SERVER ONLY (chat route): everything needed to call a published site's model. */
export async function getChatAiConfig(db: AppDb, siteId: string): Promise<ChatAiConfig | null> {
  const [row] = await db
    .select({
      ownerId: sites.ownerId,
      mode: aiSettings.mode,
      provider: aiSettings.provider,
      model: aiSettings.model,
      encryptedApiKey: aiSettings.encryptedApiKey,
      keyVersion: aiSettings.keyVersion,
    })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.status, "published")))
    .limit(1);
  if (!row) return null;
  return {
    ownerId: row.ownerId,
    mode: row.mode ?? "none",
    provider: row.provider ?? null,
    model: row.model ?? null,
    encryptedApiKey: row.encryptedApiKey ?? null,
    keyVersion: row.keyVersion ?? null,
  };
}

/** SERVER ONLY: the owner's encrypted key record (for "Test key"); never sent to the client. */
export async function getOwnerKeyRecord(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<{
  provider: ProviderId;
  model: string;
  encryptedApiKey: string;
  keyVersion: number;
} | null> {
  const [row] = await db
    .select({
      provider: aiSettings.provider,
      model: aiSettings.model,
      encryptedApiKey: aiSettings.encryptedApiKey,
      keyVersion: aiSettings.keyVersion,
    })
    .from(aiSettings)
    .innerJoin(sites, eq(sites.id, aiSettings.siteId))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!row?.provider || !row.model || !row.encryptedApiKey || row.keyVersion === null) return null;
  return {
    provider: row.provider,
    model: row.model,
    encryptedApiKey: row.encryptedApiKey,
    keyVersion: row.keyVersion,
  };
}

export type ChatbotSettings = {
  botName: string | null;
  greeting: string | null;
  tone: "friendly" | "professional" | "concise";
  widgetStyle: "mono" | "accent";
};

const asTone = (v: string | null | undefined): ChatbotSettings["tone"] =>
  v === "professional" || v === "concise" ? v : "friendly";
const asWidgetStyle = (v: string | null | undefined): ChatbotSettings["widgetStyle"] =>
  v === "accent" ? "accent" : "mono";

/** Owner view of the chatbot's name/greeting/tone/colours (null if not their site). */
export async function getChatbotSettings(
  db: AppDb,
  ownerId: string,
  siteId: string,
): Promise<ChatbotSettings | null> {
  const [row] = await db
    .select({
      botName: aiSettings.botName,
      greeting: aiSettings.greeting,
      tone: aiSettings.tone,
      widgetStyle: aiSettings.widgetStyle,
    })
    .from(sites)
    .leftJoin(aiSettings, eq(aiSettings.siteId, sites.id))
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!row) return null;
  return {
    botName: row.botName ?? null,
    greeting: row.greeting ?? null,
    tone: asTone(row.tone),
    widgetStyle: asWidgetStyle(row.widgetStyle),
  };
}

export async function setChatbotSettings(
  db: AppDb,
  ownerId: string,
  siteId: string,
  input: {
    botName: string;
    greeting: string;
    tone: ChatbotSettings["tone"];
    widgetStyle: ChatbotSettings["widgetStyle"];
  },
): Promise<{ slug: string } | null> {
  const [site] = await db
    .select({ slug: sites.slug })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);
  if (!site) return null;
  const values = {
    botName: input.botName || null,
    greeting: input.greeting || null,
    tone: input.tone,
    widgetStyle: input.widgetStyle,
  };
  await db
    .insert(aiSettings)
    .values({ siteId, ...values })
    .onConflictDoUpdate({ target: aiSettings.siteId, set: values });
  return site;
}

/** Public: how a published site's widget presents itself (no secrets). */
export async function getWidgetDisplay(
  db: AppDb,
  siteId: string,
): Promise<{ botName: string | null; greeting: string | null; widgetStyle: "mono" | "accent" }> {
  const [row] = await db
    .select({
      botName: aiSettings.botName,
      greeting: aiSettings.greeting,
      widgetStyle: aiSettings.widgetStyle,
    })
    .from(aiSettings)
    .where(eq(aiSettings.siteId, siteId))
    .limit(1);
  return {
    botName: row?.botName ?? null,
    greeting: row?.greeting ?? null,
    widgetStyle: asWidgetStyle(row?.widgetStyle),
  };
}

/** Public (chat route): the owner's chosen answer tone for a site. */
export async function getChatTone(db: AppDb, siteId: string): Promise<ChatbotSettings["tone"]> {
  const [row] = await db
    .select({ tone: aiSettings.tone })
    .from(aiSettings)
    .where(eq(aiSettings.siteId, siteId))
    .limit(1);
  return asTone(row?.tone);
}
