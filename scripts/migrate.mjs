// Applies pending Drizzle migrations.
// - Neon (default): WebSocket Pool driver so each migration runs in a real transaction.
// - Local dev: DATABASE_URL="pglite:<dir>" migrates the embedded PGlite database on disk.
// Used by `npm run db:migrate` and by `vercel-build` on every Vercel deploy.
// Fails loudly with a non-zero exit code (unlike `drizzle-kit migrate`).
import { config } from "dotenv";

// Tooling script: reads process.env directly (same exception as drizzle.config.ts).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const MIGRATIONS = "src/lib/db/migrations";
const LOCAL = "pglite:";
const appUrl = process.env.DATABASE_URL;

if (appUrl?.startsWith(LOCAL)) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = appUrl.slice(LOCAL.length) || "./.local-db";
  const client = new PGlite(dataDir, { extensions: { vector } });
  try {
    await migrate(drizzle({ client }), { migrationsFolder: MIGRATIONS });
    console.log(`[migrate] local database (${dataDir}) migrated`);
  } catch (error) {
    console.error(`[migrate] local database failed: ${error?.message ?? error}`);
    console.error("[migrate] Stop `npm run dev` first; PGlite allows one process at a time.");
    process.exitCode = 1;
  } finally {
    await client.close();
  }
} else {
  const { Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { migrate } = await import("drizzle-orm/neon-serverless/migrator");

  // Direct (unpooled) connection: migrations shouldn't go through PgBouncer.
  const url = process.env.DATABASE_URL_UNPOOLED ?? appUrl;
  if (!url) {
    console.error("[migrate] DATABASE_URL is not set. Copy .env.example to .env.local.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS });
    console.log("[migrate] migrations applied");
  } catch (error) {
    process.exitCode = 1;
    // Print the cause chain (e.g. DNS errors) but never the connection string.
    const parts = [];
    // Neon wraps network errors in `sourceError`; WebSocket ErrorEvents carry `error`;
    // everything else uses `cause`.
    for (let e = error; e; e = e.cause ?? e.sourceError ?? e.error)
      parts.push([e.name ?? e.type, e.code, e.message].filter(Boolean).join(" ") || String(e));
    console.error(`[migrate] failed: ${parts.join(" <- ").replaceAll(url, "<redacted>")}`);
  } finally {
    await pool.end();
  }
}
