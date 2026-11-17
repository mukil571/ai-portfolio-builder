import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { sites } from "./sites";

export const aiMode = pgEnum("ai_mode", ["none", "byok", "platform"]);
export const aiProvider = pgEnum("ai_provider", ["openai", "anthropic", "google"]);
export const plan = pgEnum("plan", ["free", "starter", "pro"]);
export const subscriptionStatus = pgEnum("subscription_status", ["active", "canceled"]);
export const usageKind = pgEnum("usage_kind", ["chat_message", "embedding"]);

/** One row per site. `none` = chat widget shows "AI not configured". */
export const aiSettings = pgTable(
  "ai_settings",
  {
    siteId: uuid()
      .primaryKey()
      .references(() => sites.id, { onDelete: "cascade" }),
    mode: aiMode().notNull().default("none"),
    provider: aiProvider(),
    model: text(),
    /** AES-256-GCM ciphertext (lib/crypto). Never logged, never sent to the client. */
    encryptedApiKey: text(),
    /** Which server encryption key encrypted `encryptedApiKey`; enables key rotation. */
    keyVersion: integer(),
    apiKeyLast4: varchar({ length: 4 }),
    /** Golden Rule: general tech answers are OFF unless the owner opts in. */
    allowGeneralAnswers: boolean().notNull().default(false),
    botName: text(),
    greeting: text(),
    tone: text(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // A stored key always carries its key version and last-4; no key means neither.
    check(
      "ai_settings_key_fields_together",
      sql`(${t.encryptedApiKey} is null) = (${t.keyVersion} is null) and (${t.encryptedApiKey} is null) = (${t.apiKeyLast4} is null)`,
    ),
  ],
);

/** Faked plans: real quota logic, no payment gateway. One row per user. */
export const subscriptions = pgTable("subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: plan().notNull().default("free"),
  status: subscriptionStatus().notNull().default("active"),
  currentPeriodStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Metering for platform-key quotas (counted per user per billing period). */
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid().references(() => sites.id, { onDelete: "set null" }),
    kind: usageKind().notNull(),
    /** True when our platform key paid for it (counts toward quota). */
    platformBilled: boolean().notNull(),
    provider: text(),
    model: text(),
    tokensIn: integer(),
    tokensOut: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.siteId, t.createdAt)],
);
