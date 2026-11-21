import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const siteKind = pgEnum("site_kind", ["portfolio", "business"]);
export const siteStatus = pgEnum("site_status", ["draft", "published"]);
/** How the owner hears about new unanswered visitor questions (Phase 6). */
export const questionNotify = pgEnum("question_notify", ["instant", "daily", "off"]);
export const sectionType = pgEnum("section_type", [
  "hero",
  "about",
  "skills",
  "experience",
  "education",
  "projects",
  "services",
  "pricing",
  "testimonials",
  "gallery",
  "faq",
  "contact",
  "social",
]);

/** Owner customization (validated by Zod in lib/validation before write). */
export type SiteTheme = {
  accent?: string;
  fontPair?: string;
  defaultMode?: "light" | "dark";
  heroImageUrl?: string;
};
export type SiteSeo = { title?: string; description?: string; ogImageUrl?: string };

export const sites = pgTable(
  "sites",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** Public path segment: /site/[slug]. Lowercase letters, digits, single hyphens. */
    slug: text().notNull(),
    kind: siteKind().notNull(),
    template: text().notNull().default("minimal-mono"),
    status: siteStatus().notNull().default("draft"),
    theme: jsonb().$type<SiteTheme>().notNull().default({}),
    seo: jsonb().$type<SiteSeo>().notNull().default({}),
    questionNotify: questionNotify().notNull().default("instant"),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex().on(t.slug),
    index().on(t.ownerId),
    check(
      "sites_slug_format",
      sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(${t.slug}) between 3 and 48`,
    ),
  ],
);

/** One row per section type per site; `content` is validated by the section's Zod schema. */
export const siteSections = pgTable(
  "site_sections",
  {
    id: uuid().primaryKey().defaultRandom(),
    siteId: uuid()
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    type: sectionType().notNull(),
    position: integer().notNull(),
    content: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    isVisible: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex().on(t.siteId, t.type), index().on(t.siteId, t.position)],
);
