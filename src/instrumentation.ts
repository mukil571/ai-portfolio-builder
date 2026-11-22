import type { Instrumentation } from "next";

/*
 * Error monitoring for server code (Node and edge). Off unless NEXT_PUBLIC_SENTRY_DSN is
 * set, and Sentry is only loaded then. The DSN is a public identifier, not a secret; it is
 * read directly because this runs before the app's typed env (src/env.ts) is available.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

export async function register() {
  if (!dsn) return;
  const [Sentry, { sentryOptions }] = await Promise.all([
    import("@sentry/nextjs"),
    import("@/lib/monitoring/sentry-options"),
  ]);
  Sentry.init(sentryOptions(dsn));
}

/** Reports errors from server components, route handlers and server actions. */
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
