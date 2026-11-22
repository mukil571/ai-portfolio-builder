/** "120 of 1,000 messages used" bar for the current billing period. */
export function UsageMeter({
  used,
  limit,
  resetsOn,
}: {
  used: number;
  limit: number;
  /** Already formatted for display, e.g. "23 Dec". */
  resetsOn: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const tone = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-400" : "bg-primary";
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p>
          <span className="font-semibold">{used.toLocaleString("en")}</span>
          <span className="text-muted-foreground">
            {" "}
            of {limit.toLocaleString("en")} Loriyum-AI messages used
          </span>
        </p>
        <p className="text-xs text-muted-foreground">Resets {resetsOn}</p>
      </div>
      <div
        role="meter"
        aria-label="Loriyum-AI messages used this month"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 100 ? (
        <p className="mt-2 text-xs text-destructive">
          Limit reached: sites on Loriyum&apos;s AI tell visitors to use your contact details until
          it resets. Upgrade, or use your own key for unlimited chats.
        </p>
      ) : null}
    </div>
  );
}
