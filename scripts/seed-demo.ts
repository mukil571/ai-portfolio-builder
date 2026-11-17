// Opt-in demo seed: creates/refreshes a PUBLISHED sample site at /site/demo and a DRAFT
// at /site/demo-draft, owned by the account whose email is SEED_OWNER_EMAIL.
// Runs in `vercel-build` (no-op when SEED_OWNER_EMAIL is unset) or via `npm run db:seed`.
// Never fails the build: problems are logged and the script exits 0.
// Run with Node's type stripping; only type-only imports are allowed from src/.
import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";

import { sampleSections, sampleSite } from "../src/lib/sites/sample-data.ts";

// Tooling script: reads process.env directly (same exception as drizzle.config.ts).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

const demos = [
  { slug: "demo", status: "published", name: `${sampleSite.name} (sample)` },
  { slug: "demo-draft", status: "draft", name: `${sampleSite.name} (draft sample)` },
] as const;

async function main(): Promise<void> {
  if (!ownerEmail) {
    console.log("[seed] SEED_OWNER_EMAIL not set; skipping demo seed.");
    return;
  }
  if (!url) {
    console.error("[seed] DATABASE_URL not set; skipping demo seed.");
    return;
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    const owner = await client.query<{ id: string }>(
      "select id from users where lower(email) = $1 limit 1",
      [ownerEmail],
    );
    const ownerId = owner.rows[0]?.id;
    if (!ownerId) {
      console.error("[seed] No account with SEED_OWNER_EMAIL; sign up first. Skipping.");
      return;
    }

    for (const demo of demos) {
      await client.query("begin");
      try {
        const existing = await client.query<{ id: string; owner_id: string }>(
          "select id, owner_id from sites where slug = $1",
          [demo.slug],
        );
        const row = existing.rows[0];
        if (row && row.owner_id !== ownerId) {
          console.error(`[seed] /site/${demo.slug} belongs to another account; leaving it alone.`);
          await client.query("rollback");
          continue;
        }

        let siteId: string;
        if (row) {
          siteId = row.id;
          await client.query(
            `update sites set name = $2, kind = $3, template = $4, status = $5, theme = $6, seo = $7,
               published_at = case when $5 = 'published' then coalesce(published_at, now()) else null end,
               updated_at = now()
             where id = $1`,
            [
              siteId,
              demo.name,
              sampleSite.kind,
              sampleSite.template,
              demo.status,
              sampleSite.theme,
              sampleSite.seo,
            ],
          );
          await client.query("delete from site_sections where site_id = $1", [siteId]);
        } else {
          const inserted = await client.query<{ id: string }>(
            `insert into sites (owner_id, name, slug, kind, template, status, theme, seo, published_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8, case when $6 = 'published' then now() end)
             returning id`,
            [
              ownerId,
              demo.name,
              demo.slug,
              sampleSite.kind,
              sampleSite.template,
              demo.status,
              sampleSite.theme,
              sampleSite.seo,
            ],
          );
          siteId = inserted.rows[0]!.id;
        }

        for (const section of sampleSections) {
          await client.query(
            `insert into site_sections (site_id, type, position, content, is_visible)
             values ($1, $2, $3, $4, $5)`,
            [
              siteId,
              section.type,
              section.position,
              JSON.stringify(section.content ?? {}),
              section.isVisible,
            ],
          );
        }
        await client.query("commit");
        console.log(`[seed] ${row ? "refreshed" : "created"} /site/${demo.slug} (${demo.status}).`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[seed] failed (deploy continues): ${message.replaceAll(url ?? "\u0000", "<redacted>")}`,
  );
});
