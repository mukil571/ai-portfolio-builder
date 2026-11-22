import type { ChatAiConfig } from "@/lib/db/queries/ai-settings";
import { decryptApiKey } from "@/lib/crypto/api-keys";
import type { PlanStatus } from "@/lib/plans/usage";

import { chatConfig } from "./chat-config";
import { isCatalogModel, type ProviderId } from "./model-catalog";

export type ChatModelChoice =
  | {
      kind: "ready";
      provider: ProviderId;
      model: string;
      apiKey: string;
      /** True when Loriyum's key pays (counts toward the owner's plan quota). */
      platformBilled: boolean;
    }
  | { kind: "not_configured" }
  | { kind: "quota_exceeded" };

/**
 * Decides which model answers a visitor and with whose key:
 * - byok: the owner's decrypted key with their chosen catalog model (not metered);
 * - platform: Loriyum's key, only while the owner's plan has messages left this period;
 * - anything missing or broken: "not configured" (never a fallback to someone else's key).
 */
export async function chooseChatModel(
  config: ChatAiConfig,
  siteId: string,
  deps: {
    platformKey: string | undefined;
    encryptionSecret: () => Buffer;
    planStatus: () => Promise<PlanStatus>;
  },
): Promise<ChatModelChoice> {
  if (config.mode === "byok") {
    const { provider, model, encryptedApiKey, keyVersion } = config;
    if (!provider || !model || !encryptedApiKey || keyVersion === null) {
      return { kind: "not_configured" };
    }
    if (!isCatalogModel(provider, model)) return { kind: "not_configured" };
    try {
      const apiKey = decryptApiKey(encryptedApiKey, keyVersion, siteId, deps.encryptionSecret());
      return { kind: "ready", provider, model, apiKey, platformBilled: false };
    } catch {
      // Never log key material; the reason is enough to debug.
      console.error("[chat] saved key could not be decrypted", { siteId });
      return { kind: "not_configured" };
    }
  }
  if (config.mode === "platform") {
    if (!deps.platformKey) return { kind: "not_configured" };
    const status = await deps.planStatus();
    if (status.used >= status.limit) return { kind: "quota_exceeded" };
    return {
      kind: "ready",
      provider: "google",
      model: chatConfig.PLATFORM_CHAT_MODEL,
      apiKey: deps.platformKey,
      platformBilled: true,
    };
  }
  return { kind: "not_configured" };
}
