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
    <div className="relative isolate flex min-h-full flex-1 flex-col md:flex-row">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-14rem] right-[-8rem] size-[34rem] rounded-full bg-[var(--brand-from)]/12 blur-[140px]" />
        <div className="absolute bottom-[-12rem] left-1/3 size-[28rem] rounded-full bg-[var(--brand-to)]/8 blur-[140px]" />
      </div>
      <aside className="flex shrink-0 flex-col border-b border-white/5 bg-card/30 backdrop-blur-xl md:sticky md:top-0 md:h-dvh md:w-64 md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between gap-2 px-4 md:px-5">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Logo />
            Loriyum
          </Link>
        </div>
        <DashboardNav />
        <div className="hidden p-3 md:block">
          <div className="rounded-2xl p-3 glass">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/5 px-4 py-3 md:hidden">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
