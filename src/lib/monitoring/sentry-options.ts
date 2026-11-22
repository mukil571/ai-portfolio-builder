import type { ErrorEvent } from "@sentry/nextjs";

/*
 * Shared Sentry settings (server, edge and browser). Privacy first: no default PII, no
 * request bodies, cookies or headers, no session replay or tracing, and anything that
 * looks like an API key is masked before an event leaves the app.
 */

const KEY_PATTERN = /\b(sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,})\b/g;

export function scrubText(text: string): string {
  return text.replace(KEY_PATTERN, "[redacted-key]");
}

export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  event.breadcrumbs = event.breadcrumbs?.map((b) => ({
    ...b,
    message: b.message ? scrubText(b.message) : b.message,
    data: undefined,
  }));
  return event;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  };
}
