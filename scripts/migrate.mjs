// Applies pending Drizzle migrations to Neon.
// Used by `npm run db:migrate` locally and by `vercel-build` on every Vercel deploy.
// Uses the WebSocket Pool driver so each migration runs in a real transaction,
// and fails loudly with a non-zero exit code (unlike `drizzle-kit migrate`).
import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

// Tooling script: reads process.env directly (same exception as drizzle.config.ts).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

// Direct (unpooled) connection: migrations shouldn't go through PgBouncer.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set. Copy .env.example to .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
let failed = false;
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: "src/lib/db/migrations" });
  console.log("[migrate] migrations applied");
} catch (error) {
  failed = true;
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
process.exit(failed ? 1 : 0);
