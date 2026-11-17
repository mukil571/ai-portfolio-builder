import { buttonVariants } from "@/components/ui/button";

import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          Loriyum
        </a>
        <nav
          aria-label="Main"
          className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
        >
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
        </nav>
        <a href="#early-access" className={buttonVariants({ size: "lg" })}>
          Get early access
        </a>
      </div>
    </header>
  );
}
