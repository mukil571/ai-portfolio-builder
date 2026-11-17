import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic gate for /dashboard: no session cookie -> redirect to /login?next=...
 * This only checks the cookie exists; every dashboard page and action still validates
 * the session server-side with requireUser() (lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
