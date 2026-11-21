const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "5 minutes ago", "3 hours ago", "yesterday" (server-rendered, so no hydration drift). */
export function timeAgo(date: Date, now: number = Date.now()): string {
  const minutes = Math.round((date.getTime() - now) / 60_000);
  if (minutes > -60) return relative.format(Math.min(minutes, 0), "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}
