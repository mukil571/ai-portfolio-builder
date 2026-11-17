import { ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";

/** Placeholder until the create-website wizard lands in Phase 3. */
export default function NewWebsitePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Websites
      </Link>
      <div className="mt-6 rounded-2xl border border-white/10 bg-card/60 p-8 text-center">
        <Wand2 className="mx-auto size-8 text-[var(--brand-from)]" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Website wizard is coming next</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Choosing a template, filling in sections and publishing arrive in the next update.
        </p>
      </div>
    </div>
  );
}

async function AuthGate() {
  await requireUser("/dashboard/new");
  return null;
}
