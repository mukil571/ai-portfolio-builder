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
