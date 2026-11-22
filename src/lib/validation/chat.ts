import { z } from "zod";

import { chatConfig } from "@/lib/ai/chat-config";

export const chatRequestSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  message: z
    .string()
    .min(1)
    .max(chatConfig.MAX_MESSAGE_CHARS * 2),
  conversationId: z.uuid().optional(),
  /** Honeypot: a hidden field people never see or fill. Anything here means a bot. */
  website: z.string().max(200).optional(),
  /** Milliseconds the chat had been open when this was sent (too fast = bot). */
  openedForMs: z.number().int().min(0).max(1e9).optional(),
});

export const notifyRequestSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  unansweredQuestionId: z.uuid(),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(254),
  conversationId: z.uuid().optional(),
});
