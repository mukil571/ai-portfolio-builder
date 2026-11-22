import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/50 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          Loriyum
        </a>
        <nav
          aria-label="Main"
          className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 text-sm text-muted-foreground md:flex"
        >
          <a
            href="#how"
            className="rounded-full px-4 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#features"
            className="rounded-full px-4 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#templates"
            className="rounded-full px-4 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            Templates
          </a>
          <a
            href="#pricing"
            className="rounded-full px-4 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Log in
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ size: "lg", className: "rounded-full px-4" })}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
