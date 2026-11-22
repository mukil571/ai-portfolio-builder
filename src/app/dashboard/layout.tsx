import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { UserMenu, UserMenuSkeleton } from "@/components/dashboard/user-menu";
import { Logo } from "@/components/marketing/logo";

export const metadata: Metadata = { title: "Dashboard · Loriyum", robots: { index: false } };

/**
 * Static shell (prerendered) + session-dependent parts streamed behind <Suspense>.
 * Auth: proxy.ts redirects cookie-less requests; pages call requireUser() themselves.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-white/5 bg-card/40 md:sticky md:top-0 md:h-dvh md:w-64 md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between gap-2 px-4 md:px-5">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Logo />
            Loriyum
          </Link>
        </div>
        <DashboardNav />
        <div className="hidden border-t border-white/5 p-4 md:block">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/5 px-4 py-3 md:hidden">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
        <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
