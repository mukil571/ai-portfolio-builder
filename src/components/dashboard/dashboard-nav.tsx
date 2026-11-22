"use client";

import { Gauge, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn } from "cn";

const items = [
  { href: "/dashboard", label: "My Websites", Icon: LayoutGrid },
  { href: "/dashboard/plan", label: "Plan & usage", Icon: Gauge },
] as const;

/**
 * Sidebar links; "My Websites" stays active on every site page. The active state depends
 * on the URL, so it streams in behind Suspense (the prerendered shell shows plain links).
 */
export function DashboardNav() {
  return (
    <Suspense fallback={<NavLinks active={null} />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  const pathname = usePathname();
  return (
    <NavLinks active={pathname.startsWith("/dashboard/plan") ? "/dashboard/plan" : "/dashboard"} />
  );
}

function NavLinks({ active }: { active: string | null }) {
  return (
    <nav aria-label="Dashboard" className="flex gap-1 px-3 pb-3 md:flex-1 md:flex-col md:pb-0">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active === href
              ? "bg-white/5 text-foreground"
              : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
          )}
        >
          <Icon className="size-4 text-[var(--brand-from)]" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
