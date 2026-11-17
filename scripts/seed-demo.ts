// Opt-in demo seed runner: no-op unless SEED_OWNER_EMAIL is set. Runs in `vercel-build`
// or via `npm run db:seed`. Never fails the build: problems are logged and it exits 0.
// Logic lives in src/lib/sites/seed-demo.ts (tested on PGlite).
import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";

import { seedDemoSites, type QueryFn } from "../src/lib/sites/seed-demo.ts";

// Tooling script: reads process.env directly (same exception as drizzle.config.ts).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim();
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

async function main(): Promise<void> {
  if (!ownerEmail) return console.log("[seed] SEED_OWNER_EMAIL not set; skipping demo seed.");
  if (!url) return console.error("[seed] DATABASE_URL not set; skipping demo seed.");

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    const query = ((sql: string, params?: unknown[]) => client.query(sql, params)) as QueryFn;
    for (const line of await seedDemoSites(query, ownerEmail)) console.log(`[seed] ${line}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object"
        ? JSON.stringify(error)
        : String(error);
  console.error(
    `[seed] failed (deploy continues): ${message.replaceAll(url ?? "\u0000", "<redacted>")}`,
  );
});
