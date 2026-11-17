import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { getEnv } from "@/env";

import { createLocalDb, LOCAL_DB_PREFIX } from "./local";
import * as schema from "./schema";
import type { AppDb } from "./types";

export type Db = AppDb;

let db: Db | undefined;

/**
 * Lazily creates the Drizzle client.
 * - Neon (default): WebSocket `Pool` driver with real interactive transactions, using
 *   the pooled DATABASE_URL. Node 22+ has a built-in WebSocket (engines.node pins this).
 * - Local dev: DATABASE_URL="pglite:./.local-db" uses an embedded Postgres file (lib/db/local.ts).
 * Lazy so importing this module never needs DATABASE_URL at build time.
 */
export function getDb(): Db {
  if (db) return db;
  const url = getEnv().DATABASE_URL;
  db = url.startsWith(LOCAL_DB_PREFIX)
    ? createLocalDb(url)
    : (drizzle({
        client: new Pool({ connectionString: url }),
        schema,
        casing: "snake_case",
      }) as unknown as Db);
  return db;
}
