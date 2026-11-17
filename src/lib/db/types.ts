import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/**
 * Any Drizzle Postgres database with our schema: the Neon Pool client in the app,
 * an in-memory PGlite instance in tests. Query functions take this as a parameter.
 */
export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;
