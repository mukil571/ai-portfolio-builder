import { BadgeCheck, Inbox, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/marketing/logo";

const points = [
  { Icon: ShieldCheck, text: "Your assistant only says what you approved." },
  { Icon: Inbox, text: "Unknown questions land in your inbox." },
  { Icon: BadgeCheck, text: "Answer once; every visitor gets it." },
];

/** Split layout shared by all auth screens: brand panel (desktop) + form card. */
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
    <div className="relative isolate flex flex-1 overflow-x-clip lg:grid lg:grid-cols-2">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-10rem] left-1/4 size-[36rem] aurora-blob rounded-full bg-[var(--brand-from)]/25 blur-[120px]" />
        <div className="absolute bottom-[-8rem] left-[-6rem] size-[26rem] aurora-blob rounded-full bg-[var(--brand-via)]/15 blur-[120px] [animation-delay:-8s]" />
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top_left,black_10%,transparent_60%)]" />
      </div>

      <aside className="relative hidden flex-col justify-between border-r border-white/5 p-12 lg:flex">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Logo />
          Loriyum
        </Link>
        <div>
          <p className="max-w-md text-4xl leading-tight font-semibold tracking-tight text-balance">
            A website whose AI{" "}
            <span className="text-gradient-animated">never makes things up.</span>
          </p>
          <ul className="mt-10 space-y-4">
            {points.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted-foreground">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl glass">
                  <Icon className="size-4 text-[var(--brand-to)]" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">Answers you can trust.</p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mx-auto mb-8 flex w-fit items-center gap-2 font-semibold tracking-tight lg:hidden"
          >
            <Logo />
            Loriyum
          </Link>
          <main className="glow-border rounded-3xl p-6 glass sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </main>
          {footer ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
