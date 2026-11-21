import { z } from "zod";

import { chatConfig } from "@/lib/ai/chat-config";

export const chatRequestSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  message: z
    .string()
    .min(1)
    .max(chatConfig.MAX_MESSAGE_CHARS * 2),
  conversationId: z.uuid().optional(),
});

export const notifyRequestSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  unansweredQuestionId: z.uuid(),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(254),
  conversationId: z.uuid().optional(),
});
