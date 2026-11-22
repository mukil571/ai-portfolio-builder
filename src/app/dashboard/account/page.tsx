import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { DeleteAccount } from "@/components/workspace/delete-account";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account · Loriyum" };

/** Export or delete everything stored for this account. */
export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-2xl bg-white/5" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const user = await requireUser("/dashboard/account");
  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl p-5 glass">
        <p className="text-sm">
          Signed in as <span className="font-medium">{user.name}</span>{" "}
          <span className="break-all text-muted-foreground">({user.email})</span>
        </p>
      </section>
      <section className="rounded-2xl p-5 glass">
        <h2 className="font-semibold tracking-tight">Download my data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One file with your sites, content, facts, questions, conversations and visitor emails.
          Passwords and AI keys are never included.
        </p>
        <a
          href="/api/account/export"
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
        >
          <Download aria-hidden="true" /> Download (JSON)
        </a>
      </section>
      <DeleteAccount email={user.email} />
    </div>
  );
}
