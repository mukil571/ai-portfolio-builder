import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";

import type { ProviderId } from "./model-catalog";

/** One language model for a provider + model + API key (owner's or the platform's). */
export function languageModel(provider: ProviderId, model: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
  }
}

export type KeyTestResult =
  { ok: true } | { ok: false; reason: "rejected" | "model" | "limited" | "unreachable" };

/**
 * Makes one tiny request to check a key works with the chosen model. Only an error
 * CATEGORY is returned or logged: provider error messages never leave this function,
 * because they can echo request details.
 */
export async function testApiKey(
  provider: ProviderId,
  model: string,
  apiKey: string,
  generate: typeof generateText = generateText,
): Promise<KeyTestResult> {
  try {
    await generate({
      model: languageModel(provider, model, apiKey),
      prompt: "Reply with the single word OK.",
      maxOutputTokens: 16,
      maxRetries: 0,
    });
    return { ok: true };
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    // Google reports an invalid key as 400 "API key not valid". The message is only
    // inspected here, never logged or returned.
    const badKeyText = /api[_ ]?key/i.test(String((error as Error)?.message ?? ""));
    const reason =
      status === 401 || status === 403 || (status === 400 && badKeyText)
        ? "rejected"
        : status === 404 || status === 400
          ? "model"
          : status === 429
            ? "limited"
            : "unreachable";
    console.warn("[ai] key test failed", { provider, model, status: status ?? null, reason });
    return { ok: false, reason };
  }
}
