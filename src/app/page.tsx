import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { FadeIn } from "@/components/fade-in";
import { ChatPreview } from "@/components/marketing/chat-preview";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Logo } from "@/components/marketing/logo";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { SiteHeader } from "@/components/marketing/site-header";
import { TemplateGallery } from "@/components/marketing/template-gallery";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div id="top" className="relative isolate flex flex-1 flex-col overflow-x-clip">
      {/* Ambient background: soft brand glows over a faint grid. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] bg-[size:56px_56px]" />
        <div className="absolute top-[-12rem] left-1/2 size-[40rem] -translate-x-1/2 aurora-blob rounded-full bg-[var(--brand-from)]/30 blur-[120px]" />
        <div className="absolute top-40 right-[-10rem] size-[26rem] aurora-blob rounded-full bg-[var(--brand-to)]/20 blur-[120px] [animation-delay:-6s]" />
        <div className="absolute top-72 left-[-10rem] size-[24rem] aurora-blob rounded-full bg-[var(--brand-via)]/15 blur-[120px] [animation-delay:-12s]" />
      </div>

      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-32">
          <div className="flex flex-col items-start">
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground glass">
                <span className="size-1.5 rounded-full bg-[var(--brand-to)]" />
                Owner-in-the-loop AI website builder
              </span>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold tracking-tighter text-balance sm:text-6xl lg:text-7xl">
                Your website, with an AI that{" "}
                <span className="text-gradient-animated">only says what you approved.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                Publish a portfolio or business site with a built-in assistant. When a visitor asks
                something it doesn&apos;t know, you answer once, and it knows it for everyone after.
              </p>
            </FadeIn>
            <FadeIn delay={0.24}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className={buttonVariants({
                    size: "lg",
                    className: "h-12 rounded-full px-6 text-sm",
                  })}
                >
                  Create your site
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
                <a
                  href="#how"
                  className={buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className: "h-12 rounded-full px-6 text-sm",
                  })}
                >
                  See how it works
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.32}>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Free to start", "8 designer templates", "Your AI key or ours"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>

          <FadeIn delay={0.2}>
            <div className="flex justify-center lg:justify-end">
              <ChatPreview />
            </div>
          </FadeIn>
        </section>

        <HowItWorks />
        <Features />
        <TemplateGallery />
        <PricingTeaser />

        <section id="get-started" className="scroll-mt-20 px-4 pb-24 sm:px-6 sm:pb-32">
          <FadeIn>
            <div className="glow-border relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-6 py-20 text-center glass sm:px-16">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-24 mx-auto size-72 aurora-blob rounded-full bg-[var(--brand-from)]/35 blur-[100px]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
              />
              <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                Teach your site once. <span className="text-gradient">Let it answer forever.</span>
              </h2>
              <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">
                Create a free account and set up your first site in minutes.
              </p>
              <Link
                href="/signup"
                className={buttonVariants({
                  size: "lg",
                  className: "relative mt-8 h-12 rounded-full px-6 text-sm",
                })}
              >
                Get started free
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </div>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <Logo className="size-5" />
            Loriyum
          </span>
          <span>Answers you can trust.</span>
        </div>
      </footer>
    </div>
  );
}
