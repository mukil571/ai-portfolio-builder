"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { setAssistant } from "@/lib/db/queries/chat";
import { siteCacheTag } from "@/lib/sites/slug";

const schema = z.object({
  siteId: z.uuid(),
  enabled: z.boolean(),
  allowGeneralAnswers: z.boolean(),
});

/** Owner turns the site assistant on/off (platform AI until Phase 8). */
export async function setAssistantAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something went wrong. Please try again." };
  const { siteId, ...settings } = parsed.data;
  const result = await setAssistant(getDb(), user.id, siteId, settings);
  if (!result) return { ok: false, error: "We couldn't find that site." };
  // The published page shows/hides the chat widget from cached data.
  updateTag(siteCacheTag(result.slug));
  return { ok: true };
}
