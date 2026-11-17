import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/marketing/logo";

/** Centered card layout shared by all auth screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 items-center justify-center px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10rem] left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-[var(--brand-from)]/20 blur-[120px]"
      />
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2 font-semibold tracking-tight"
        >
          <Logo />
          Loriyum
        </Link>
        <main className="rounded-2xl border border-white/10 bg-card/70 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </main>
        {footer ? <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p> : null}
      </div>
    </div>
  );
}
