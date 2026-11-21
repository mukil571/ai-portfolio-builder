import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";

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

export class ChatUnavailableError extends Error {}

/**
 * Real model dependencies for the chat pipeline using the PLATFORM key
 * (owners' own providers arrive in Phase 8).
 */
export function platformChatDeps(): ChatDeps {
  const apiKey = getEnv().GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new ChatUnavailableError("Platform AI key missing");
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google(chatConfig.PLATFORM_CHAT_MODEL);

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
