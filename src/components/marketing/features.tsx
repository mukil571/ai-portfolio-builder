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
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="bg-background p-8">
              <f.icon className="size-6 text-[var(--brand-from)]" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-medium">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
