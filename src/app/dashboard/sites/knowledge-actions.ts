"use server";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  createApprovedFact,
  createKnowledgeFileRecord,
  createProposedFacts,
  deleteFact,
  listUnindexedFactIds,
  setFactStatus,
  setKnowledgeFileStatus,
  updateFact,
} from "@/lib/db/queries/knowledge";
import { getEditableSite } from "@/lib/db/queries/site-builder";
import { embed } from "@/lib/knowledge/embeddings";
import { ExtractionUnavailableError, extractFacts } from "@/lib/knowledge/extract";
import { indexFact } from "@/lib/knowledge/indexing";
import { starterFactsFromSections } from "@/lib/knowledge/starter-facts";
import {
  addFactSchema,
  factIdSchema,
  MAX_TXT_BYTES,
  siteIdSchema,
  suggestFromTextSchema,
  updateFactSchema,
} from "@/lib/validation/knowledge";

/*
 * Knowledge base server actions. Each: Zod-validates input, takes the user from the
 * session, calls owner-scoped queries. Owner-written facts are approved and indexed
 * immediately; anything suggested (text, file, site content) is PROPOSED for review.
 */

export type KnowledgeResult = { ok: true; message?: string } | { ok: false; error: string };

const GENERIC = "Something went wrong. Please try again.";
const NOT_FOUND = "We couldn't find that.";
const NOT_SEARCHABLE =
  "Saved, but the assistant can't search it yet (indexing isn't available). Use “Retry indexing” later.";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? GENERIC;

async function index(factId: string): Promise<boolean> {
  return indexFact(getDb(), factId, embed);
}

export async function addFactAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = addFactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { siteId, ...fact } = parsed.data;
  const id = await createApprovedFact(getDb(), user.id, siteId, fact);
  if (!id) return { ok: false, error: NOT_FOUND };
  return (await index(id)) ? { ok: true } : { ok: true, message: NOT_SEARCHABLE };
}

export async function updateFactAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = updateFactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { factId, ...fact } = parsed.data;
  const updated = await updateFact(getDb(), user.id, factId, fact);
  if (!updated) return { ok: false, error: NOT_FOUND };
  if (updated.status === "approved" && !(await index(factId))) {
    return { ok: true, message: NOT_SEARCHABLE };
  }
  return { ok: true };
}

export async function approveFactAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = factIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  if (!(await setFactStatus(getDb(), user.id, parsed.data.factId, "approved"))) {
    return { ok: false, error: NOT_FOUND };
  }
  return (await index(parsed.data.factId)) ? { ok: true } : { ok: true, message: NOT_SEARCHABLE };
}

export async function rejectFactAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = factIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ok = await setFactStatus(getDb(), user.id, parsed.data.factId, "rejected");
  return ok ? { ok: true } : { ok: false, error: NOT_FOUND };
}

export async function deleteFactAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = factIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ok = await deleteFact(getDb(), user.id, parsed.data.factId);
  return ok ? { ok: true } : { ok: false, error: NOT_FOUND };
}

export async function retryIndexingAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = siteIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const ids = await listUnindexedFactIds(getDb(), user.id, parsed.data.siteId);
  let failed = 0;
  for (const id of ids) if (!(await index(id))) failed++;
  return failed
    ? { ok: false, error: `${failed} fact(s) still couldn't be indexed. Try again later.` }
    : {
        ok: true,
        message: ids.length ? "All facts are searchable now." : "Everything is already searchable.",
      };
}

function suggestionMessage(added: number): string {
  return added
    ? `${added} suggested fact${added === 1 ? "" : "s"} added for your review.`
    : "No new facts found (or they're already in your knowledge base).";
}

async function proposeFromText(
  userId: string,
  siteId: string,
  text: string,
  source: "resume" | "file",
  fileId: string | null,
): Promise<KnowledgeResult> {
  try {
    const facts = await extractFacts(text);
    const added = await createProposedFacts(getDb(), userId, siteId, facts, source, fileId);
    if (added === null) return { ok: false, error: NOT_FOUND };
    return { ok: true, message: suggestionMessage(added) };
  } catch (error) {
    if (error instanceof ExtractionUnavailableError) {
      return {
        ok: false,
        error: "Fact suggestions aren't set up yet. You can still add facts by hand.",
      };
    }
    console.error("[knowledge] extraction failed", (error as Error)?.message);
    return { ok: false, error: "We couldn't read facts from that text. Please try again." };
  }
}

export async function suggestFromTextAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = suggestFromTextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return proposeFromText(user.id, parsed.data.siteId, parsed.data.text, "resume", null);
}

/** TXT upload: parsed in memory; the original file is NOT stored. */
export async function uploadKnowledgeFileAction(formData: FormData): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsedSite = siteIdSchema.safeParse({ siteId: formData.get("siteId") });
  const file = formData.get("file");
  if (!parsedSite.success || !(file instanceof File)) return { ok: false, error: GENERIC };
  if (!/\.txt$/i.test(file.name) || (file.type && file.type !== "text/plain")) {
    return { ok: false, error: "Only .txt files are supported for now. Paste other text instead." };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_TXT_BYTES) return { ok: false, error: "Files can be up to 200 KB." };

  // Decode as UTF-8 and strip control characters (text only; nothing is executed).
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(await file.arrayBuffer())
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (text.length < 40) return { ok: false, error: "That file doesn't contain enough text." };

  const db = getDb();
  const { siteId } = parsedSite.data;
  const fileId = await createKnowledgeFileRecord(db, user.id, siteId, {
    filename: file.name.slice(0, 200),
    mimeType: "text/plain",
    sizeBytes: file.size,
  });
  if (!fileId) return { ok: false, error: NOT_FOUND };
  const result = await proposeFromText(user.id, siteId, text, "file", fileId);
  await setKnowledgeFileStatus(
    db,
    fileId,
    result.ok ? "processed" : "failed",
    result.ok ? null : result.error,
  );
  return result;
}

export async function suggestFromSiteAction(input: unknown): Promise<KnowledgeResult> {
  const user = await requireUser();
  const parsed = siteIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const db = getDb();
  const site = await getEditableSite(db, user.id, parsed.data.siteId);
  if (!site) return { ok: false, error: NOT_FOUND };
  const facts = starterFactsFromSections(site.sections);
  const added = await createProposedFacts(db, user.id, site.id, facts, "wizard");
  return { ok: true, message: suggestionMessage(added ?? 0) };
}
