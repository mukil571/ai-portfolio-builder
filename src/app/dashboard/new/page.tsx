import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { NewSiteForm } from "@/components/wizard/new-site-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create website · Loriyum" };

export default function NewWebsitePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Websites
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">Create a website</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white/5" />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const user = await requireUser("/dashboard/new");
  return <NewSiteForm defaultName={`${user.name.split(" ")[0] || "My"}'s site`} />;
}
