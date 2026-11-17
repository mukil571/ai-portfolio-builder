import { Check } from "lucide-react";
import Link from "next/link";

import { FadeIn } from "@/components/fade-in";
import { buttonVariants } from "@/components/ui/button";

// Teaser only: plans are simulated (no payments) and quotas are finalized in Phase 8.
const plans = [
  {
    name: "Free",
    price: "$0",
    blurb: "Bring your own AI key.",
    points: ["1 published site", "Unlimited approved facts", "Questions inbox"],
  },
  {
    name: "Starter",
    price: "$9",
    blurb: "We provide the AI.",
    points: ["3 published sites", "Included monthly AI messages", "Email alerts for new questions"],
    featured: true,
  },
  {
    name: "Pro",
    price: "$19",
    blurb: "For busy businesses.",
    points: [
      "10 published sites",
      "More monthly AI messages",
      "Conversation history & leads export",
    ],
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-[var(--brand-to)]">Pricing</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Start free. Upgrade when your site gets busy.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Prices are a preview; plans are free to try while Loriyum is in beta.
          </p>
        </FadeIn>
        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={
                plan.featured
                  ? "relative rounded-2xl border border-[var(--brand-from)]/50 bg-card/70 p-6 shadow-[0_0_60px_-20px_var(--brand-from)]"
                  : "rounded-2xl border border-white/10 bg-card/40 p-6"
              }
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  Most popular
                </span>
              ) : null}
              <h3 className="font-medium">{plan.name}</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[var(--brand-to)]"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className={buttonVariants({ size: "lg", className: "h-11 px-5 text-sm" })}
          >
            Start free
          </Link>
        </div>
      </div>
    </section>
  );
}
