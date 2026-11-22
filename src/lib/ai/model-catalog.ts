/*
 * Models owners may pick with their own key. A short, tested list on purpose: every model
 * here supports the structured output the grounding gate relies on (docs/chat-grounding.md).
 * Safe to import in client components (no secrets).
 */

export const providerIds = ["google", "openai", "anthropic"] as const;
export type ProviderId = (typeof providerIds)[number];

export const modelCatalog: Record<
  ProviderId,
  { label: string; keyHint: string; keysUrl: string; models: { id: string; label: string }[] }
> = {
  google: {
    label: "Google Gemini",
    keyHint: "Starts with “AIza”",
    keysUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (fast, cheapest)" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (smarter)" },
    ],
  },
  openai: {
    label: "OpenAI",
    keyHint: "Starts with “sk-”",
    keysUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini (fast, cheap)" },
      { id: "gpt-5.5", label: "GPT-5.5 (smarter)" },
    ],
  },
  anthropic: {
    label: "Anthropic Claude",
    keyHint: "Starts with “sk-ant-”",
    keysUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fast, cheap)" },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (smarter)" },
    ],
  },
};

export function isCatalogModel(provider: ProviderId, model: string): boolean {
  return modelCatalog[provider].models.some((m) => m.id === model);
}
