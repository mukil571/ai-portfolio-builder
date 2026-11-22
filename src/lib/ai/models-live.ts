import "server-only";

import { generateText, Output, type LanguageModel } from "ai";

import { getEnv } from "@/env";
import { embed } from "@/lib/knowledge/embeddings";

import { chatConfig } from "./chat-config";
import { draftSchema, type ChatDeps } from "./pipeline";
import {
  draftSystemPrompt,
  draftUserPrompt,
  generalSystemPrompt,
  generalUserPrompt,
} from "./prompts";
import { languageModel } from "./providers";

export class ChatUnavailableError extends Error {}

/**
 * Chat pipeline dependencies for any language model (the owner's own or the platform's).
 * Embeddings ALWAYS use the fixed platform embedding model (CLAUDE.md §3), whatever
 * model writes the answers; the grounding gate is the same for every model.
 */
export function chatDepsForModel(model: LanguageModel): ChatDeps {
  return {
    embed,
    draft: async ({ owner, facts, message }) => {
      const { output } = await generateText({
        model,
        system: draftSystemPrompt(owner),
        prompt: draftUserPrompt(facts, message),
        output: Output.object({ schema: draftSchema }),
        temperature: 0,
        maxRetries: 1,
      });
      return output;
    },
    general: async ({ owner, message }) => {
      const { text } = await generateText({
        model,
        system: generalSystemPrompt(owner),
        prompt: generalUserPrompt(message),
        temperature: 0.2,
        maxOutputTokens: 300,
        maxRetries: 1,
      });
      return text;
    },
  };
}

/** Dependencies using Loriyum's own key and platform model (eval, platform mode). */
export function platformChatDeps(): ChatDeps {
  const apiKey = getEnv().GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new ChatUnavailableError("Platform AI key missing");
  return chatDepsForModel(languageModel("google", chatConfig.PLATFORM_CHAT_MODEL, apiKey));
}
