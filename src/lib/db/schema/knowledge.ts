import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// Relative import: drizzle-kit loads this file outside Next's path aliases.
import { EMBEDDING_DIMENSIONS } from "../../knowledge/embedding-config";

import { sites } from "./sites";

export const factSource = pgEnum("fact_source", ["manual", "wizard", "file", "resume", "inbox"]);
/** Golden Rule: retrieval reads ONLY `approved` facts. `proposed` = awaiting owner review. */
export const factStatus = pgEnum("fact_status", ["proposed", "approved", "rejected"]);
/** `private` = answer shown only to the visitor who asked (Phase 6). */
export const factVisibility = pgEnum("fact_visibility", ["public", "private"]);
export const fileStatus = pgEnum("knowledge_file_status", [
  "uploaded",
  "processing",
  "processed",
  "failed",
]);
export const questionStatus = pgEnum("question_status", ["open", "answered", "ignored"]);

export const knowledgeFiles = pgTable(
  "knowledge_files",
  {
    id: uuid().primaryKey().defaultRandom(),
    siteId: uuid()
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    filename: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    /**
     * Where the original file is stored. Null: originals are NOT kept (parsed in memory,
     * only extracted facts are stored), per the Phase 4 privacy decision.
     */
    storageKey: text(),
    status: fileStatus().notNull().default("uploaded"),
    /** Friendly failure reason; technical details go to server logs. */
    error: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.siteId)],
);

export const unansweredQuestions = pgTable(
  "unanswered_questions",
  {
    id: uuid().primaryKey().defaultRandom(),
    siteId: uuid()
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    question: text().notNull(),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    /** Model that produced `embedding`; dedup only compares rows from the same model. */
    embeddingModel: text(),
    /** Semantic dedup: similar open questions increment this instead of inserting. */
    askedCount: integer().notNull().default(1),
    status: questionStatus().notNull().default("open"),
    /** Set when the owner merges this into another question. */
    mergedIntoId: uuid().references((): AnyPgColumn => unansweredQuestions.id, {
      onDelete: "set null",
    }),
    answerFactId: uuid().references((): AnyPgColumn => knowledgeFacts.id, {
      onDelete: "set null",
    }),
    firstAskedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastAskedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    answeredAt: timestamp({ withTimezone: true }),
    /** When the owner was emailed about this question (instant email or daily digest). */
    ownerNotifiedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    // No ANN index: similarity is exact cosine (`<=>`) over one site's rows (see lib/knowledge/similarity.ts).
    index().on(t.siteId, t.status, t.askedCount.desc()),
    check("unanswered_questions_asked_count_positive", sql`${t.askedCount} >= 1`),
  ],
);

export const knowledgeFacts = pgTable(
  "knowledge_facts",
  {
    id: uuid().primaryKey().defaultRandom(),
    siteId: uuid()
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    /** Short title or the question this fact answers. */
    question: text().notNull(),
    answer: text().notNull(),
    source: factSource().notNull(),
    status: factStatus().notNull().default("proposed"),
    visibility: factVisibility().notNull().default("public"),
    /** Optional expiry (e.g. "available from March"); expired facts are not retrieved. */
    expiresAt: timestamp({ withTimezone: true }),
    fileId: uuid().references(() => knowledgeFiles.id, { onDelete: "set null" }),
    /** The inbox question this fact was written to answer (Phase 6). */
    sourceQuestionId: uuid().references((): AnyPgColumn => unansweredQuestions.id, {
      onDelete: "set null",
    }),
    /** Null until embedded; un-embedded facts are never retrieved. */
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    /** Model that produced `embedding`; retrieval only compares rows from the same model. */
    embeddingModel: text(),
    /** When the owner first approved the fact (status -> approved). */
    approvedAt: timestamp({ withTimezone: true }),
    /** When the owner last confirmed the fact is still accurate (staleness / re-verify prompts). */
    verifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // No ANN index: retrieval is exact cosine (`<=>`) filtered by site_id + status (see lib/knowledge/similarity.ts).
  (t) => [index().on(t.siteId, t.status)],
);
