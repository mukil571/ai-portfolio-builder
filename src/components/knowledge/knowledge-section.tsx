import { getEnv } from "@/env";
import { getDb } from "@/lib/db";
import { listFacts } from "@/lib/db/queries/knowledge";

import { KnowledgeManager, type FactView } from "./knowledge-manager";

/** Server wrapper: loads the owner's facts and renders the manager. */
export async function KnowledgeSection({ ownerId, siteId }: { ownerId: string; siteId: string }) {
  const facts = (await listFacts(getDb(), ownerId, siteId)) ?? [];
  const views: FactView[] = facts
    .filter((f): f is typeof f & { status: "proposed" | "approved" } => f.status !== "rejected")
    .map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      status: f.status,
      visibility: f.visibility,
      expiresAt: f.expiresAt ? f.expiresAt.toISOString() : null,
      searchable: f.searchable,
      source: f.source,
    }));
  return (
    <KnowledgeManager
      siteId={siteId}
      facts={views}
      suggestionsEnabled={Boolean(getEnv().GOOGLE_GENERATIVE_AI_API_KEY)}
    />
  );
}
