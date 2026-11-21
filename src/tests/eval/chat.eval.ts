/**
 * REAL-MODEL evaluation of the visitor chat (docs/chat-grounding.md §5).
 * Run: `npm run eval` (needs GOOGLE_GENERATIVE_AI_API_KEY in .env.local).
 * Uses an in-memory Postgres with the real migrations and the real platform models.
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { platformChatDeps } from "@/lib/ai/models-live";
import { runChatPipeline, type ChatDeps, type ChatOutcome } from "@/lib/ai/pipeline";
import { createDraftSite } from "@/lib/db/queries/site-builder";
import { knowledgeFacts, unansweredQuestions, users } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";
import { indexFact } from "@/lib/knowledge/indexing";

import { createTestDb } from "../helpers/test-db";
import {
  dedupGroups,
  evalCases,
  otherTenantFacts,
  OWNER,
  priyaFacts,
  priyaTrapFacts,
  type FixtureFact,
} from "./chat-eval-set";

let db: AppDb;
let close: () => Promise<void>;
let deps: ChatDeps;
let priyaSite: string;
const factIdByKey = new Map<string, string>();
const report: { id: string; pass: boolean; kind: string; text: string; note?: string }[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retries on provider rate limits (free tiers allow only a few requests per minute). */
function withBackoff<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        const msg = String((error as Error)?.message ?? error);
        if (
          attempt < 2 &&
          /429|rate|quota|exhausted|overloaded|503|demand|unavailable/i.test(msg)
        ) {
          await sleep(15_000 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
  };
}

async function insertFacts(owner: string, siteId: string, facts: FixtureFact[]) {
  for (const f of facts) {
    const now = new Date();
    const [row] = await db
      .insert(knowledgeFacts)
      .values({
        siteId,
        question: f.question,
        answer: f.answer,
        source: "manual",
        status: f.status ?? "approved",
        visibility: f.visibility ?? "public",
        expiresAt: f.expiresAt ? new Date(f.expiresAt) : null,
        approvedAt: (f.status ?? "approved") === "approved" ? now : null,
      })
      .returning({ id: knowledgeFacts.id });
    factIdByKey.set(f.key, row!.id);
    // Index every approved fact (incl. private/expired traps) so the GATE is what excludes them.
    if ((f.status ?? "approved") === "approved") {
      expect(await indexFact(db, row!.id, deps.embed), `index ${owner}/${f.key}`).toBe(true);
    }
  }
}

beforeAll(async () => {
  const live = platformChatDeps();
  deps = {
    embed: withBackoff(live.embed),
    draft: withBackoff(live.draft),
    general: withBackoff(live.general),
  };
  ({ db, close } = await createTestDb());
  await db.insert(users).values([
    { id: "priya", name: "Priya Raman", email: "priya@example.com", emailVerified: true },
    { id: "other", name: "Other", email: "other@example.com", emailVerified: true },
  ]);
  priyaSite = await createDraftSite(db, "priya", {
    name: "Priya",
    kind: "portfolio",
    template: "minimal-mono",
  });
  const otherSite = await createDraftSite(db, "other", {
    name: "Other",
    kind: "business",
    template: "minimal-mono",
  });
  await insertFacts("priya", priyaSite, [...priyaFacts, ...priyaTrapFacts]);
  await insertFacts("other", otherSite, otherTenantFacts);
}, 600_000);

afterAll(async () => {
  const passed = report.filter((r) => r.pass).length;
  console.log(`\n=== Chat eval: ${passed}/${report.length} passed ===`);
  for (const r of report) {
    console.log(
      `${r.pass ? "PASS" : "FAIL"} ${r.id.padEnd(4)} ${r.kind.padEnd(9)} ${r.text.replace(/\s+/g, " ").slice(0, 110)}${r.note ? `  <- ${r.note}` : ""}`,
    );
  }
  await close();
});

function check(c: (typeof evalCases)[number], out: ChatOutcome): string | null {
  const lower = out.text.toLowerCase();
  for (const bad of c.mustNotInclude ?? []) {
    if (lower.includes(bad.toLowerCase())) return `contains forbidden "${bad}"`;
  }
  if (out.kind !== c.expect.kind) return `expected ${c.expect.kind}, got ${out.kind}`;
  if (c.expect.kind === "answer" && out.kind === "answer") {
    for (const key of c.expect.factKeys) {
      if (!out.factIds.includes(factIdByKey.get(key)!)) return `did not cite fact "${key}"`;
    }
    for (const must of c.expect.mustInclude) {
      if (!lower.includes(must.toLowerCase())) return `missing "${must}"`;
    }
  }
  if (c.expect.kind === "unknown" && out.kind === "unknown" && !out.unansweredQuestionId) {
    return "question was not logged";
  }
  return null;
}

describe("chat eval (real models)", () => {
  for (const c of evalCases) {
    it(`${c.id} ${c.category}: ${c.question}`, async () => {
      const out = await runChatPipeline(
        db,
        {
          siteId: priyaSite,
          owner: OWNER,
          allowGeneralAnswers: c.allowGeneralAnswers ?? false,
          message: c.question,
        },
        deps,
      );
      const problem = check(c, out);
      report.push({
        id: c.id,
        pass: !problem,
        kind: out.kind,
        text: out.text,
        note: problem ?? undefined,
      });
      expect(problem, `${c.id}: ${out.text}`).toBeNull();
    }, 300_000);
  }

  for (const group of dedupGroups) {
    it(`${group.id} dedup: ${group.questions.join(" | ")}`, async () => {
      const ids = new Set<string>();
      for (const q of group.questions) {
        const out = await runChatPipeline(
          db,
          { siteId: priyaSite, owner: OWNER, allowGeneralAnswers: false, message: q },
          deps,
        );
        expect(out.kind, `"${q}" should be unknown`).toBe("unknown");
        if (out.kind === "unknown") ids.add(out.unansweredQuestionId);
      }
      const [row] = await db
        .select()
        .from(unansweredQuestions)
        .where(eq(unansweredQuestions.id, [...ids][0]!));
      const problem =
        ids.size !== 1
          ? `paraphrases split into ${ids.size} questions`
          : row!.askedCount < group.questions.length
            ? `askedCount ${row!.askedCount} < ${group.questions.length}`
            : null;
      report.push({
        id: group.id,
        pass: !problem,
        kind: "dedup",
        text: group.questions.join(" | "),
        note: problem ?? undefined,
      });
      expect(problem).toBeNull();
    }, 600_000);
  }

  it("dedup groups stay separate from each other", async () => {
    const open = await db
      .select({ question: unansweredQuestions.question, n: unansweredQuestions.askedCount })
      .from(unansweredQuestions)
      .where(eq(unansweredQuestions.siteId, priyaSite));
    const refunds = open.filter((q) => /refund|money back/i.test(q.question));
    const nda = open.filter((q) => /nda|non-disclosure/i.test(q.question));
    expect(refunds.length, "refund questions in one row").toBe(1);
    expect(nda.length, "NDA questions in one row").toBe(1);
  });
});
