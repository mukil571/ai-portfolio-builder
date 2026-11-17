/**
 * Returns `next` only if it is a same-origin relative path; otherwise the fallback.
 * Prevents open redirects via ?next=https://evil.example or //evil.example.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
