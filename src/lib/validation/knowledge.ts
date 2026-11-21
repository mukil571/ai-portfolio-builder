import { z } from "zod";

const siteId = z.uuid();
const factId = z.uuid();

/** "YYYY-MM-DD" (date input) -> end of that day UTC; "" -> no expiry. */
const expiry = z
  .union([z.literal(""), z.iso.date()])
  .optional()
  .transform((v) => (v ? new Date(`${v}T23:59:59.999Z`) : null));

export const factFieldsSchema = z.object({
  question: z.string().trim().min(3, "Write the question (at least 3 characters).").max(300),
  answer: z.string().trim().min(1, "Write the answer.").max(2000),
  visibility: z.enum(["public", "private"]).default("public"),
  expiresAt: expiry,
});

export const addFactSchema = factFieldsSchema.extend({ siteId });
export const updateFactSchema = factFieldsSchema.extend({ factId });
export const factIdSchema = z.object({ factId });
export const siteIdSchema = z.object({ siteId });

export const suggestFromTextSchema = z.object({
  siteId,
  text: z
    .string()
    .trim()
    .min(40, "Paste a bit more text (at least a few sentences).")
    .max(20_000, "That's too long. Paste up to 20,000 characters."),
});

/** Plain-text knowledge files only (PDF/DOCX deferred). */
export const MAX_TXT_BYTES = 200 * 1024;
export const TXT_TYPES = ["text/plain", ""] as const;
