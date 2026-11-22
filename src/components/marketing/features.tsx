import { KeyRound, LayoutTemplate, ShieldCheck, Zap } from "lucide-react";

import { FadeIn } from "@/components/fade-in";

const features = [
  {
    icon: ShieldCheck,
    title: "Never makes things up",
    body: "Rates, availability, and policies come only from facts you approved, each one traceable.",
  },
  {
    icon: LayoutTemplate,
    title: "Sites that look designed",
    body: "Portfolio and business templates with real type, motion, and dark mode. Empty sections just disappear.",
  },
  {
    icon: KeyRound,
    title: "Your AI, your choice",
    body: "Bring your own OpenAI, Anthropic, or Google key, or use ours with a monthly plan.",
  },
  {
    icon: Zap,
    title: "Live in minutes",
    body: "Pick a template, fill in what you have, and publish to your own link. No hosting to manage.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-[var(--brand-to)]">Why Loriyum</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built so you can trust what your site says.
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className={i === 0 || i === 3 ? "lg:col-span-2" : undefined}>
              <FadeIn delay={i * 0.06}>
                <div className="relative h-full lift overflow-hidden rounded-3xl p-8 glass">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[var(--brand-from)]/15 blur-3xl"
                  />
                  <span className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-from)]/30 via-[var(--brand-via)]/20 to-[var(--brand-to)]/20 ring-1 ring-white/10">
                    <f.icon className="size-6 text-white" aria-hidden="true" />
                  </span>
                  <h3 className="relative mt-6 text-xl font-semibold tracking-tight">{f.title}</h3>
                  <p className="relative mt-2 max-w-md leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </FadeIn>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
