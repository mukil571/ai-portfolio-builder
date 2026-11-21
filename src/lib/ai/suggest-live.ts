import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { getEnv } from "@/env";
import { embed } from "@/lib/knowledge/embeddings";
import type { Embedder } from "@/lib/knowledge/indexing";

import { chatConfig } from "./chat-config";
import {
  suggestionSchema,
  suggestSystemPrompt,
  suggestUserPrompt,
  type SuggestDrafter,
} from "./suggest";

export class SuggestUnavailableError extends Error {}

/** Platform-key dependencies for inbox reply suggestions. */
export function platformSuggestDeps(): { embed: Embedder; draft: SuggestDrafter } {
  const apiKey = getEnv().GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new SuggestUnavailableError("Platform AI key missing");
  const model = createGoogleGenerativeAI({ apiKey })(chatConfig.PLATFORM_CHAT_MODEL);
  return {
    embed,
    draft: async ({ owner, facts, question }) => {
      const { output } = await generateText({
        model,
        system: suggestSystemPrompt(owner),
        prompt: suggestUserPrompt(facts, question),
        output: Output.object({ schema: suggestionSchema }),
        temperature: 0,
        maxRetries: 1,
      });
      return output;
    },
  };
}
