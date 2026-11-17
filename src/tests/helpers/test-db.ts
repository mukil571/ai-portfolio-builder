import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/types";

/**
 * A fresh in-memory Postgres (PGlite + pgvector) with all real migrations applied.
 * Each call is fully isolated. Use for query, ownership and tenant-isolation tests.
 */
export async function createTestDb(): Promise<{ db: AppDb; close: () => Promise<void> }> {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle({ client, schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "src/lib/db/migrations" });
  return { db, close: () => client.close() };
}
