import { Suspense } from "react";

import { EmptySites, SiteGrid, SiteGridSkeleton } from "@/components/dashboard/site-grid";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listSitesForOwner } from "@/lib/db/queries/sites";

export default function MyWebsitesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">My Websites</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your sites, their status, and questions waiting for your answer.
      </p>
      <div className="mt-8">
        <Suspense fallback={<SiteGridSkeleton />}>
          <Sites />
        </Suspense>
      </div>
    </div>
  );
}

async function Sites() {
  const user = await requireUser("/dashboard");
  const sites = await listSitesForOwner(getDb(), user.id);
  return sites.length === 0 ? <EmptySites /> : <SiteGrid sites={sites} />;
}
