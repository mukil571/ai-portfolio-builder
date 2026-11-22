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
    <section id="how" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-[var(--brand-to)]">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            An assistant that learns from you, not from guesses.
          </h2>
        </FadeIn>
        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-12 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-[var(--brand-via)]/60 to-transparent md:block"
          />
          <ol className="relative grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <FadeIn delay={i * 0.08}>
                  <div className="relative h-full lift rounded-3xl p-7 glass">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_8px_24px_-8px_var(--brand-from)]">
                        <step.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-gradient font-mono text-sm font-semibold">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
