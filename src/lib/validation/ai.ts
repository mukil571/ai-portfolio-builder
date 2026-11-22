import { z } from "zod";

import { providerIds } from "@/lib/ai/model-catalog";
import { planIds } from "@/lib/plans/plans";

const siteId = z.uuid();

export const aiModeSchema = z.object({
  siteId,
  mode: z.enum(["none", "platform", "byok"]),
  allowGeneralAnswers: z.boolean(),
});

export const saveKeySchema = z.object({
  siteId,
  provider: z.enum(providerIds),
  model: z.string().min(1).max(80),
  apiKey: z
    .string()
    .trim()
    .min(10, "That doesn't look like a full API key.")
    .max(400, "That key is too long.")
    .regex(/^\S+$/, "API keys don't contain spaces."),
});

export const siteOnlySchema = z.object({ siteId });
export const byokModelSchema = z.object({ siteId, model: z.string().min(1).max(80) });
export const changePlanSchema = z.object({ plan: z.enum(planIds) });

export const chatTones = ["friendly", "professional", "concise"] as const;
export type ChatTone = (typeof chatTones)[number];
export const widgetStyles = ["mono", "accent"] as const;
export type WidgetStyle = (typeof widgetStyles)[number];

export const chatbotSettingsSchema = z.object({
  siteId,
  botName: z.string().trim().max(40, "Keep the name under 40 characters."),
  greeting: z.string().trim().max(240, "Keep the greeting under 240 characters."),
  tone: z.enum(chatTones),
  widgetStyle: z.enum(widgetStyles),
});
