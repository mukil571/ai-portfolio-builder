import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuth } from ".";

export type SessionUser = { id: string; name: string; email: string; image: string | null };

/**
 * The signed-in, email-verified user, or null. Reads the request: call inside <Suspense>.
 * Wrapped in React cache(): the sidebar and the page share one check per request.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<SessionUser | null> {
  // Read the request first: during prerender this postpones rendering, so auth
  // (and its env/DB) is only initialised at request time.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || !session.user.emailVerified) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
});

/**
 * Server-side auth gate for dashboard pages and server actions. The proxy only checks
 * that a session cookie exists; this validates it (signed cookie cache, else the database).
 */
export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
