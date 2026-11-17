// Applies pending Drizzle migrations to Neon over HTTPS.
// Used by `npm run db:migrate` locally and by `vercel-build` on every Vercel deploy.
// Unlike `drizzle-kit migrate`, it fails loudly with a non-zero exit code.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Tooling script: reads process.env directly (same exception as drizzle.config.ts).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set. Copy .env.example to .env.local.");
  process.exit(1);
}

try {
  await migrate(drizzle({ client: neon(url) }), {
    migrationsFolder: "src/lib/db/migrations",
  });
  console.log("[migrate] migrations applied");
} catch (error) {
  // Print the cause chain (e.g. DNS errors) but never the connection string.
  const parts = [];
  // Neon wraps network errors in `sourceError`; everything else uses `cause`.
  for (let e = error; e; e = e.cause ?? e.sourceError)
    parts.push(e instanceof Error ? e.message : String(e));
  console.error(`[migrate] failed: ${parts.join(" <- ").replaceAll(url, "<redacted>")}`);
  process.exit(1);
}
