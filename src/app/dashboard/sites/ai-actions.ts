"use server";

import { updateTag } from "next/cache";

import { getEnv } from "@/env";
import { isCatalogModel, modelCatalog } from "@/lib/ai/model-catalog";
import { testApiKey, type KeyTestResult } from "@/lib/ai/providers";
import { requireUser } from "@/lib/auth/session";
import {
  decryptApiKey,
  encryptApiKey,
  KeyEncryptionUnavailableError,
  parseEncryptionSecret,
} from "@/lib/crypto/api-keys";
import { getDb } from "@/lib/db";
import {
  deleteApiKey,
  getOwnerAiSettings,
  getOwnerKeyRecord,
  setAiMode,
  setByokModel,
  storeApiKey,
} from "@/lib/db/queries/ai-settings";
import { changePlan } from "@/lib/plans/usage";
import { plans } from "@/lib/plans/plans";
import { siteCacheTag } from "@/lib/sites/slug";
import { hitRateLimit, RATE_LIMITED_MESSAGE } from "@/lib/security/rate-limit";
import {
  aiModeSchema,
  byokModelSchema,
  changePlanSchema,
  saveKeySchema,
  siteOnlySchema,
} from "@/lib/validation/ai";

/*
 * AI & API actions. Each: Zod-validates, takes the owner from the session, calls
 * owner-scoped queries. The plaintext key exists only inside saveApiKeyAction /
 * testSavedKeyAction: it is never logged, stored unencrypted or returned.
 */

export type AiResult = { ok: true; message?: string } | { ok: false; error: string };

const GENERIC = "Something went wrong. Please try again.";
const NOT_FOUND = "We couldn't find that site.";
const NO_ENCRYPTION =
  "Saving your own key isn't available on this server yet. Use Loriyum's AI for now.";

const keyTestMessage: Record<Exclude<KeyTestResult, { ok: true }>["reason"], string> = {
  rejected: "The provider rejected that key. Check you copied all of it and that it's active.",
  model: "That key works, but not with this model. Pick another model or check your account.",
  limited: "That key has hit its provider's usage or billing limit. Check your provider account.",
  unreachable: "We couldn't reach the provider just now. Please try again in a minute.",
};

function encryptionSecret(): Buffer | null {
  try {
    return parseEncryptionSecret(getEnv().API_KEY_ENCRYPTION_KEY);
  } catch (error) {
    if (error instanceof KeyEncryptionUnavailableError) return null;
    throw error;
  }
}

export async function setAiModeAction(input: unknown): Promise<AiResult> {
  const user = await requireUser();
  const parsed = aiModeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const { siteId, ...settings } = parsed.data;
  const result = await setAiMode(getDb(), user.id, siteId, settings);
  if (!result.ok) {
    return {
      ok: false,
      error: result.problem === "no_key" ? "Save and test your own key first." : NOT_FOUND,
    };
  }
  // The published page shows or hides the chat widget from cached data.
  updateTag(siteCacheTag(result.slug));
  return { ok: true, message: "Saved." };
}

/** Tests the key with one tiny request, then encrypts and saves it (and switches to it). */
export async function saveApiKeyAction(input: unknown): Promise<AiResult> {
  const user = await requireUser();
  const parsed = saveKeySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  const { siteId, provider, model, apiKey } = parsed.data;
  if (!isCatalogModel(provider, model)) return { ok: false, error: "Pick a model from the list." };
  const secret = encryptionSecret();
  if (!secret) return { ok: false, error: NO_ENCRYPTION };

  const db = getDb();
  if (!(await getOwnerAiSettings(db, user.id, siteId))) return { ok: false, error: NOT_FOUND };
  if (!(await hitRateLimit(db, "keyTest", user.id))) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  const test = await testApiKey(provider, model, apiKey);
  if (!test.ok) return { ok: false, error: keyTestMessage[test.reason] };

  const encrypted = encryptApiKey(apiKey, siteId, secret);
  const saved = await storeApiKey(db, user.id, siteId, { provider, model, ...encrypted });
  if (!saved) return { ok: false, error: NOT_FOUND };
  updateTag(siteCacheTag(saved.slug));
  return {
    ok: true,
    message: `Key works and is saved. Your assistant now uses ${modelCatalog[provider].label}.`,
  };
}

export async function testSavedKeyAction(input: unknown): Promise<AiResult> {
  const user = await requireUser();
  const parsed = siteOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const secret = encryptionSecret();
  if (!secret) return { ok: false, error: NO_ENCRYPTION };
  if (!(await hitRateLimit(getDb(), "keyTest", user.id))) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }
  const record = await getOwnerKeyRecord(getDb(), user.id, parsed.data.siteId);
  if (!record) return { ok: false, error: "No key is saved for this site." };
  let apiKey: string;
  try {
    apiKey = decryptApiKey(record.encryptedApiKey, record.keyVersion, parsed.data.siteId, secret);
  } catch {
    console.error("[ai] saved key could not be decrypted", { siteId: parsed.data.siteId });
    return {
      ok: false,
      error: "Your saved key can't be read anymore. Please delete it and add it again.",
    };
  }
  const test = await testApiKey(record.provider, record.model, apiKey);
  return test.ok
    ? { ok: true, message: "Your key works." }
    : { ok: false, error: keyTestMessage[test.reason] };
}

export async function setByokModelAction(input: unknown): Promise<AiResult> {
  const user = await requireUser();
  const parsed = byokModelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const db = getDb();
  const settings = await getOwnerAiSettings(db, user.id, parsed.data.siteId);
  if (!settings?.provider) return { ok: false, error: "Save a key first." };
  if (!isCatalogModel(settings.provider, parsed.data.model)) {
    return { ok: false, error: "Pick a model from the list." };
  }
  const ok = await setByokModel(db, user.id, parsed.data.siteId, parsed.data.model);
  return ok ? { ok: true, message: "Model changed." } : { ok: false, error: NOT_FOUND };
}

export async function deleteApiKeyAction(input: unknown): Promise<AiResult> {
  const user = await requireUser();
  const parsed = siteOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const result = await deleteApiKey(getDb(), user.id, parsed.data.siteId);
  if (!result) return { ok: false, error: NOT_FOUND };
  updateTag(siteCacheTag(result.slug));
  return { ok: true, message: "Key deleted." };
}

/** Simulated plan change (no payment). */
export async function changePlanAction(input: unknown): Promise<AiResult> {
  const user = await requireUser();
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  await changePlan(getDb(), user.id, parsed.data.plan);
  return {
    ok: true,
    message: `You're on ${plans[parsed.data.plan].name} now (simulated, no charge).`,
  };
}
