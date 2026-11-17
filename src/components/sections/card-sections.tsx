import { ArrowUpRight, Check, Code2 } from "lucide-react";

import type { SectionContent } from "@/lib/validation/sections";

import { SectionShell, sectionTitles, SiteLink, Tag } from "./section-shell";

const card = "rounded-xl border border-site-border bg-site-card p-5";

export function ProjectsSection({
  content,
  index,
}: {
  content: SectionContent<"projects">;
  index: number;
}) {
  return (
    <SectionShell id="projects" index={index} title={sectionTitles.projects}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {content.items.map((p, i) => (
          <li key={`${p.title}-${i}`} className={`${card} flex flex-col`}>
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- owner-hosted image, see hero.tsx
              <img
                src={p.imageUrl}
                alt={p.imageAlt ?? ""}
                loading="lazy"
                width={640}
                height={360}
                className="mb-4 aspect-video w-full rounded-lg border border-site-border object-cover"
              />
            ) : null}
            <h3 className="font-medium">{p.title}</h3>
            {p.description ? (
              <p className="mt-2 text-sm leading-relaxed text-site-muted">{p.description}</p>
            ) : null}
            {p.tags.length ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
                {p.tags.map((t) => (
                  <li key={t}>
                    <Tag>{t}</Tag>
                  </li>
                ))}
              </ul>
            ) : null}
            {p.url || p.repoUrl ? (
              <div className="mt-auto flex gap-4 pt-5 text-sm">
                {p.url ? (
                  <SiteLink
                    href={p.url}
                    className="inline-flex items-center gap-1 font-medium underline decoration-site-accent underline-offset-4"
                  >
                    View project <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </SiteLink>
                ) : null}
                {p.repoUrl ? (
                  <SiteLink
                    href={p.repoUrl}
                    className="inline-flex items-center gap-1 text-site-muted hover:text-site-fg"
                  >
                    <Code2 className="size-3.5" aria-hidden="true" /> Source
                  </SiteLink>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function ServicesSection({
  content,
  index,
}: {
  content: SectionContent<"services">;
  index: number;
}) {
  return (
    <SectionShell id="services" index={index} title={sectionTitles.services}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {content.items.map((s, i) => (
          <li key={`${s.title}-${i}`} className={card}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-medium">{s.title}</h3>
              {s.price ? <p className="font-mono text-sm text-site-muted">{s.price}</p> : null}
            </div>
            {s.description ? (
              <p className="mt-2 text-sm leading-relaxed text-site-muted">{s.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function PricingSection({
  content,
  index,
}: {
  content: SectionContent<"pricing">;
  index: number;
}) {
  return (
    <SectionShell id="pricing" index={index} title={sectionTitles.pricing}>
      <ul className="grid gap-4 lg:grid-cols-3">
        {content.items.map((plan, i) => (
          <li
            key={`${plan.name}-${i}`}
            className={`${card} ${plan.highlighted ? "border-site-accent ring-1 ring-site-accent" : ""}`}
          >
            <h3 className="font-medium">{plan.name}</h3>
            <p className="mt-3">
              <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
              {plan.period ? (
                <span className="text-sm text-site-muted"> / {plan.period}</span>
              ) : null}
            </p>
            {plan.description ? (
              <p className="mt-2 text-sm text-site-muted">{plan.description}</p>
            ) : null}
            {plan.features.length ? (
              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-site-accent" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function TestimonialsSection({
  content,
  index,
}: {
  content: SectionContent<"testimonials">;
  index: number;
}) {
  return (
    <SectionShell id="testimonials" index={index} title={sectionTitles.testimonials}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {content.items.map((t, i) => (
          <li key={`${t.author}-${i}`}>
            <figure className={`${card} h-full`}>
              <blockquote className="leading-relaxed text-pretty">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-medium">{t.author}</span>
                {t.role ? <span className="text-site-muted"> · {t.role}</span> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function GallerySection({
  content,
  index,
}: {
  content: SectionContent<"gallery">;
  index: number;
}) {
  return (
    <SectionShell id="gallery" index={index} title={sectionTitles.gallery}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {content.items.map((img, i) => (
          <li key={`${img.imageUrl}-${i}`}>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-hosted image, see hero.tsx */}
              <img
                src={img.imageUrl}
                alt={img.alt}
                loading="lazy"
                width={400}
                height={400}
                className="aspect-square w-full rounded-lg border border-site-border object-cover"
              />
              {img.caption ? (
                <figcaption className="mt-2 text-xs text-site-muted">{img.caption}</figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
