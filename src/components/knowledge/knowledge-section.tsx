import { getEnv } from "@/env";
import { getDb } from "@/lib/db";
import { getAssistantSettings } from "@/lib/db/queries/chat";
import { listFacts } from "@/lib/db/queries/knowledge";

import { AssistantSettings } from "./assistant-settings";
import { KnowledgeManager, type FactView } from "./knowledge-manager";

/** Server wrapper: loads the owner's facts and assistant settings and renders them. */
export async function KnowledgeSection({ ownerId, siteId }: { ownerId: string; siteId: string }) {
  const db = getDb();
  const [facts, assistant] = await Promise.all([
    listFacts(db, ownerId, siteId),
    getAssistantSettings(db, ownerId, siteId),
  ]);
  const aiReady = Boolean(getEnv().GOOGLE_GENERATIVE_AI_API_KEY);
  const views: FactView[] = (facts ?? [])
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
    <div className="space-y-8">
      <AssistantSettings
        siteId={siteId}
        initial={assistant ?? { enabled: false, allowGeneralAnswers: false }}
        platformReady={aiReady}
      />
      <KnowledgeManager siteId={siteId} facts={views} suggestionsEnabled={aiReady} />
    </div>
  );
}
