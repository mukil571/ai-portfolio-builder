// Demo seed logic (driver-agnostic so it can be tested on PGlite and run on Neon).
// Creates/refreshes a PUBLISHED sample at /site/demo and a DRAFT at /site/demo-draft
// owned by the account with `ownerEmail`. Never takes over a slug owned by someone else.
// Runtime imports use explicit .ts extensions so Node type-stripping can run it directly.
import { sampleSections, sampleSite } from "./sample-data.ts";

export type QueryFn = <R = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<{ rows: R[] }>;

const demos = [
  { slug: "demo", status: "published", name: `${sampleSite.name} (sample)` },
  { slug: "demo-draft", status: "draft", name: `${sampleSite.name} (draft sample)` },
] as const;

/** Returns human-readable log lines; throws only on unexpected database errors. */
export async function seedDemoSites(query: QueryFn, ownerEmail: string): Promise<string[]> {
  const log: string[] = [];
  const owner = await query<{ id: string }>(
    "select id from users where lower(email) = $1 limit 1",
    [ownerEmail.trim().toLowerCase()],
  );
  const ownerId = owner.rows[0]?.id;
  if (!ownerId) return ["No account with SEED_OWNER_EMAIL; sign up first. Skipping."];

  const theme = JSON.stringify(sampleSite.theme);
  const seo = JSON.stringify(sampleSite.seo);

  for (const demo of demos) {
    await query("begin");
    try {
      const existing = await query<{ id: string; owner_id: string }>(
        "select id, owner_id from sites where slug = $1",
        [demo.slug],
      );
      const row = existing.rows[0];
      if (row && row.owner_id !== ownerId) {
        await query("rollback");
        log.push(`/site/${demo.slug} belongs to another account; leaving it alone.`);
        continue;
      }

      // Every parameter has ONE explicit type (Postgres rejects a param used as two types).
      let siteId: string;
      if (row) {
        siteId = row.id;
        await query(
          `update sites set name = $2::text, kind = $3::site_kind, template = $4::text,
             status = $5::site_status, theme = $6::jsonb, seo = $7::jsonb,
             published_at = case when $5::site_status = 'published'
               then coalesce(published_at, now()) else null end,
             updated_at = now()
           where id = $1::uuid`,
          [siteId, demo.name, sampleSite.kind, sampleSite.template, demo.status, theme, seo],
        );
        await query("delete from site_sections where site_id = $1::uuid", [siteId]);
      } else {
        const inserted = await query<{ id: string }>(
          `insert into sites (owner_id, name, slug, kind, template, status, theme, seo, published_at)
           values ($1::text, $2::text, $3::text, $4::site_kind, $5::text, $6::site_status,
             $7::jsonb, $8::jsonb, case when $6::site_status = 'published' then now() end)
           returning id`,
          [
            ownerId,
            demo.name,
            demo.slug,
            sampleSite.kind,
            sampleSite.template,
            demo.status,
            theme,
            seo,
          ],
        );
        siteId = inserted.rows[0]!.id;
      }

      for (const section of sampleSections) {
        await query(
          `insert into site_sections (site_id, type, position, content, is_visible)
           values ($1::uuid, $2::section_type, $3::int, $4::jsonb, $5::boolean)`,
          [
            siteId,
            section.type,
            section.position,
            JSON.stringify(section.content ?? {}),
            section.isVisible,
          ],
        );
      }
      await query("commit");
      log.push(`${row ? "refreshed" : "created"} /site/${demo.slug} (${demo.status}).`);
    } catch (error) {
      await query("rollback");
      throw error;
    }
  }
  return log;
}
