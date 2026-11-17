import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/lib/db";

type Health = { ok: boolean; db: boolean; pgvector: boolean };

/** Liveness + DB check. Exposes only booleans; error details go to server logs. */
export async function GET(): Promise<Response> {
  // Opt out of prerendering: this must run per request (Cache Components model).
  await connection();

  try {
    const rows = await getDb().execute<{ present: boolean }>(
      sql`select exists(select 1 from pg_extension where extname = 'vector') as present`,
    );
    const pgvector = rows.rows[0]?.present === true;
    const body: Health = { ok: pgvector, db: true, pgvector };
    return Response.json(body, { status: pgvector ? 200 : 503 });
  } catch (error) {
    console.error("[health] database check failed", error);
    const body: Health = { ok: false, db: false, pgvector: false };
    return Response.json(body, { status: 503 });
  }
}
