import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

import { getEnv } from "@/env";

import * as schema from "./schema";

export type Db = NeonDatabase<typeof schema>;

let db: Db | undefined;

/**
 * Lazily creates the Drizzle client on Neon's WebSocket `Pool` driver, which supports
 * real interactive transactions (`db.transaction(...)`). Node 22+ has a built-in
 * WebSocket, so no `ws` polyfill is needed (engines.node pins this).
 *
 * Uses the pooled DATABASE_URL (PgBouncer). Lazy so importing this module never
 * needs DATABASE_URL at build time.
 */
export function getDb(): Db {
  db ??= drizzle({
    client: new Pool({ connectionString: getEnv().DATABASE_URL }),
    schema,
    casing: "snake_case",
  });
  return db;
}
