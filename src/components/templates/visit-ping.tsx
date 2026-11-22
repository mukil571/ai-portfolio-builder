"use client";

import { useEffect } from "react";

/**
 * Counts one page view for the owner's Overview. Sends only the site's slug: no cookies,
 * no identifiers. Skipped when the browser asks not to be tracked.
 */
export function VisitPing({ slug }: { slug: string }) {
  useEffect(() => {
    if (
      navigator.doNotTrack === "1" ||
      (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl
    ) {
      return;
    }
    const body = JSON.stringify({ slug });
    if (!navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [slug]);
  return null;
}
