import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { getEnv } from "@/env";

import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let db: Db | undefined;

/**
 * Lazily creates the Drizzle client (Neon HTTP driver: one stateless HTTPS request
 * per query). Lazy so importing this module never needs DATABASE_URL at build time.
 */
export function getDb(): Db {
  db ??= drizzle({ client: neon(getEnv().DATABASE_URL), schema });
  return db;
}
