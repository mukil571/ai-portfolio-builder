import { MessageCircleQuestion, PenLine, Sparkles } from "lucide-react";

import { FadeIn } from "@/components/fade-in";

const steps = [
  {
    icon: MessageCircleQuestion,
    title: "A visitor asks something new",
    body: "Your assistant never guesses. Unknown questions are logged, grouped with similar ones, and sent to you.",
  },
  {
    icon: PenLine,
    title: "You answer once",
    body: "Reply from your dashboard with an AI-drafted suggestion you can edit. Nothing goes live until you approve it.",
  },
  {
    icon: Sparkles,
    title: "Every visitor gets it instantly",
    body: "Your answer becomes a verified fact. The person who asked gets an email, and so does everyone after them.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-[var(--brand-to)]">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            An assistant that learns from you, not from guesses.
          </h2>
        </FadeIn>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <FadeIn delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-white/10 bg-card/50 p-6 transition-colors hover:border-white/20">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-from)]/25 to-[var(--brand-to)]/15 text-foreground ring-1 ring-white/10">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </FadeIn>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
