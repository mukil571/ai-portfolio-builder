/** Same rule as the sites_slug_format DB constraint. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 48 && SLUG.test(slug);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Cache tag for a published site's data; revalidate it on publish/edit/unpublish. */
export function siteCacheTag(slug: string): string {
  return `site:${slug}`;
}

/** Prefix for the temporary slug a draft gets until the owner picks one at publish. */
export const DRAFT_SLUG_PREFIX = "draft-";

/** Words that can't be site addresses (product routes, brand, confusing or demo slugs). */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "dashboard",
  "demo",
  "demo-draft",
  "docs",
  "draft",
  "help",
  "home",
  "login",
  "logout",
  "loriyum",
  "new",
  "official",
  "preview",
  "pricing",
  "privacy",
  "root",
  "settings",
  "signup",
  "site",
  "sites",
  "staff",
  "status",
  "support",
  "system",
  "team",
  "templates",
  "terms",
  "test",
  "www",
]);

export type SlugProblem = "format" | "reserved" | "taken";

/** Friendly, specific message for each slug problem. */
export const slugProblemMessage: Record<SlugProblem, string> = {
  format: "Use 3–48 lowercase letters, numbers and single hyphens (e.g. jane-doe).",
  reserved: "That address is reserved. Try another one.",
  taken: "That address is already taken. Try another one.",
};

/** Format and reserved-word checks (no DB). Returns the problem, or null if usable. */
export function checkSlugShape(slug: string): Exclude<SlugProblem, "taken"> | null {
  if (!isValidSlug(slug)) return "format";
  if (RESERVED_SLUGS.has(slug) || slug.startsWith(DRAFT_SLUG_PREFIX)) return "reserved";
  return null;
}

/** "Jane Doe's Studio!" -> "jane-does-studio" (may still need checkSlugShape). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}
