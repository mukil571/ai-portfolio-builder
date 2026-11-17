import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/lib/db";

type Health = { ok: boolean; db: boolean; pgvector: boolean; schema: boolean };

/**
 * Liveness + DB check. Exposes only booleans; error details go to server logs.
 * `schema` = the Phase 1 tables exist (migrations have run).
 */
export async function GET(): Promise<Response> {
  // Opt out of prerendering: this must run per request (Cache Components model).
  await connection();

  try {
    const { rows } = await getDb().execute<{ pgvector: boolean; schema: boolean }>(sql`
      select
        exists(select 1 from pg_extension where extname = 'vector') as pgvector,
        (to_regclass('public.sites') is not null
          and to_regclass('public.knowledge_facts') is not null
          and to_regclass('public.users') is not null) as schema
    `);
    const pgvector = rows[0]?.pgvector === true;
    const schema = rows[0]?.schema === true;
    const ok = pgvector && schema;
    const body: Health = { ok, db: true, pgvector, schema };
    return Response.json(body, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error("[health] database check failed", error);
    const body: Health = { ok: false, db: false, pgvector: false, schema: false };
    return Response.json(body, { status: 503 });
  }
}
