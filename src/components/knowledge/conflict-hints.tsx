import { TriangleAlert } from "lucide-react";

import type { FactConflict } from "@/lib/db/queries/workspace";

/** Pairs of approved facts that seem to be about the same thing but give different numbers. */
export function ConflictHints({ conflicts }: { conflicts: FactConflict[] }) {
  if (!conflicts.length) return null;
  return (
    <section
      aria-labelledby="conflicts-heading"
      className="mb-8 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-5"
    >
      <h2 id="conflicts-heading" className="flex items-center gap-2 font-semibold tracking-tight">
        <TriangleAlert className="size-5 text-amber-300" aria-hidden="true" />
        {conflicts.length === 1
          ? "These facts may disagree"
          : `${conflicts.length} pairs of facts may disagree`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        They look like they&apos;re about the same thing but give different numbers. If one is out
        of date, edit or delete it below so your assistant can&apos;t give mixed answers.
      </p>
      <ul className="mt-4 space-y-3">
        {conflicts.slice(0, 10).map((c) => (
          <li key={`${c.a.id}-${c.b.id}`} className="grid gap-2 text-sm sm:grid-cols-2">
            {[c.a, c.b].map((f) => (
              <div key={f.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-medium">{f.question}</p>
                <p className="mt-1 text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
