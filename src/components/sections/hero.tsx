import { ArrowRight, MapPin } from "lucide-react";

import { FadeIn } from "@/components/fade-in";
import type { SectionContent } from "@/lib/validation/sections";

import { SiteLink } from "./section-shell";

export function HeroSection({ content }: { content: SectionContent<"hero"> }) {
  const { name, headline, subheadline, location, imageUrl, ctaLabel, ctaUrl } = content;
  return (
    <section
      id="home"
      aria-label="Introduction"
      className="site-hero pt-16 pb-20 sm:pt-28 sm:pb-28"
    >
      <div className="site-hero-grid mx-auto grid max-w-5xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="site-hero-text">
          <FadeIn>
            {location ? (
              <p className="site-hero-eyebrow inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-site-muted">
                <MapPin className="size-3.5" aria-hidden="true" />
                {location}
              </p>
            ) : null}
            <h1 className="site-hero-title mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              {name ?? headline}
            </h1>
          </FadeIn>
          {name && headline ? (
            <FadeIn delay={0.08}>
              <p className="site-hero-headline mt-4 text-xl text-balance sm:text-2xl">
                <span className="site-hero-slash text-site-accent-ink" aria-hidden="true">
                  /
                </span>{" "}
                {headline}
              </p>
            </FadeIn>
          ) : null}
          {subheadline ? (
            <FadeIn delay={0.14}>
              <p className="site-hero-sub mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-site-muted">
                {subheadline}
              </p>
            </FadeIn>
          ) : null}
          {ctaLabel && ctaUrl ? (
            <FadeIn delay={0.2}>
              <SiteLink
                href={ctaUrl}
                className="site-btn mt-10 inline-flex items-center gap-2 rounded-lg bg-site-fg px-5 py-3 text-sm font-medium text-site-bg transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-accent"
              >
                {ctaLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </SiteLink>
            </FadeIn>
          ) : null}
        </div>
        {imageUrl ? (
          <div className="site-hero-media">
            <FadeIn delay={0.1}>
              {/* Owner-hosted image of arbitrary origin; optimized delivery arrives with uploads (Phase 3). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={name ? `Portrait of ${name}` : ""}
                width={280}
                height={280}
                className="site-hero-image size-48 rounded-2xl border border-site-border object-cover sm:size-64"
              />
            </FadeIn>
          </div>
        ) : null}
      </div>
    </section>
  );
}
