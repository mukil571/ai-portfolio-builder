// Browser error monitoring; off unless NEXT_PUBLIC_SENTRY_DSN is set (inlined at build).
// Loaded lazily: without a DSN the Sentry code is never downloaded, keeping pages fast.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void Promise.all([import("@sentry/nextjs"), import("@/lib/monitoring/sentry-options")]).then(
    ([Sentry, { sentryOptions }]) => Sentry.init(sentryOptions(dsn)),
  );
}
