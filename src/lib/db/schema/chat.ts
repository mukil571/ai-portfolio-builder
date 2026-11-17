import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { unansweredQuestions } from "./knowledge";
import { sites } from "./sites";

export const messageRole = pgEnum("message_role", ["visitor", "assistant"]);
export const messageIntent = pgEnum("message_intent", [
  "owner_fact",
  "general_tech",
  "off_topic",
  "unknown",
]);
export const leadPurpose = pgEnum("lead_purpose", ["notify_answer", "contact"]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    siteId: uuid()
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    /** Anonymous visitor id from a first-party cookie. */
    visitorId: text().notNull(),
    /** Salted hash, never the raw IP (used for rate limiting / abuse). */
    ipHash: text(),
    userAgent: text(),
    messageCount: integer().notNull().default(0),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.siteId, t.lastMessageAt.desc()), index().on(t.siteId, t.visitorId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole().notNull(),
    content: text().notNull(),
    intent: messageIntent(),
    /** Golden Rule traceability: knowledge_facts ids behind an owner-fact answer. */
    factIds: uuid().array().notNull().default([]),
    unansweredQuestionId: uuid().references(() => unansweredQuestions.id, {
      onDelete: "set null",
    }),
    provider: text(),
    model: text(),
    tokensIn: integer(),
    tokensOut: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.conversationId, t.createdAt)],
);

/** Visitor emails: "email me when answered" and contact requests. */
export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    siteId: uuid()
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    email: text().notNull(),
    name: text(),
    purpose: leadPurpose().notNull(),
    conversationId: uuid().references(() => conversations.id, { onDelete: "set null" }),
    unansweredQuestionId: uuid().references(() => unansweredQuestions.id, {
      onDelete: "set null",
    }),
    notifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.siteId, t.createdAt.desc()), index().on(t.unansweredQuestionId)],
);
