import "server-only";

import { createRequire } from "node:module";
import path from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "./schema";
import type { AppDb } from "./types";

export const LOCAL_DB_PREFIX = "pglite:";

/**
 * Local development database: an embedded Postgres (PGlite + pgvector) stored on disk,
 * used when DATABASE_URL is "pglite:<dir>". Lets the app run fully offline, e.g. when
 * the network blocks Neon. Apply migrations with `npm run db:migrate` (dev server stopped).
 *
 * PGlite is a devDependency: it's loaded through a runtime require with a computed name
 * so production bundles and file tracing never include it.
 */
/**
 * One PGlite instance per process, shared via globalThis. Next.js gives route handlers
 * and pages separate module scopes; separate instances on the same directory don't see
 * each other's writes (e.g. a session created by /api/auth was invisible to a page).
 */
const globalForLocalDb = globalThis as typeof globalThis & { __loriyumLocalDb?: AppDb };

export function createLocalDb(url: string): AppDb {
  globalForLocalDb.__loriyumLocalDb ??= openLocalDb(url);
  return globalForLocalDb.__loriyumLocalDb;
}

function openLocalDb(url: string): AppDb {
  // Allowed for local `next dev` and `next start` (e2e), never on Vercel.
  if (process.env.VERCEL) {
    throw new Error("pglite: DATABASE_URL is for local development only.");
  }
  const dataDir = url.slice(LOCAL_DB_PREFIX.length) || "./.local-db";
  // Resolve from the project root (import.meta.url is virtual inside the server bundle).
  const load = createRequire(path.join(process.cwd(), "package.json"));
  const scope = "@electric-sql/";
  const { PGlite: PGliteCtor } = load(`${scope}pglite`) as { PGlite: typeof PGlite };
  const { vector } = load(`${scope}pglite-pgvector`) as { vector: unknown };
  const client = new PGliteCtor(dataDir, { extensions: { vector } as never });
  return drizzle({ client, schema, casing: "snake_case" }) as unknown as AppDb;
}
