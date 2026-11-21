import { timingSafeEqual } from "node:crypto";

/** Constant-time check of "Authorization: Bearer <CRON_SECRET>"; false if no secret is set. */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
