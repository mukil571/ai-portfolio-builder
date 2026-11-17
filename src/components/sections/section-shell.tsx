import type { ReactNode } from "react";

import { FadeIn } from "@/components/fade-in";

export const sectionTitles = {
  hero: "Home",
  about: "About",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  services: "Services",
  pricing: "Pricing",
  testimonials: "Testimonials",
  gallery: "Gallery",
  faq: "FAQ",
  contact: "Contact",
  social: "Elsewhere",
} as const;

/** Standard section frame: anchor id, mono index label, h2, restrained fade-in. */
export function SectionShell({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-20 border-t border-site-border py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn>
          <div className="grid gap-8 md:grid-cols-[12rem_1fr] md:gap-12">
            <div>
              <p className="font-mono text-xs tracking-widest text-site-muted uppercase">
                {String(index).padStart(2, "0")}
              </p>
              <h2 id={headingId} className="mt-2 text-xl font-semibold tracking-tight">
                {title}
              </h2>
            </div>
            <div className="min-w-0">{children}</div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/** Small mono tag/pill used across sections. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-site-border px-2 py-0.5 font-mono text-xs text-site-muted">
      {children}
    </span>
  );
}

/** External-safe link: new tab + noopener for http(s), same tab for #/mailto/tel. */
export function SiteLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
    >
      {children}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

export function dateRange(start?: string, end?: string) {
  if (start && end) return `${start} — ${end}`;
  return start ?? end ?? null;
}
