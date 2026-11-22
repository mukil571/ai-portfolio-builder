import { Check } from "lucide-react";
import Link from "next/link";

import { FadeIn } from "@/components/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { plans as planData } from "@/lib/plans/plans";

// Same numbers as the real (simulated) plans, so the landing page never over-promises.
const fmt = (n: number) => n.toLocaleString("en");
const plans = [
  {
    name: planData.free.name,
    price: planData.free.price,
    blurb: "Try it, or bring your own AI key.",
    points: [
      `${fmt(planData.free.monthlyMessages)} Loriyum-AI messages / month`,
      "Unlimited chats with your own AI key",
      "Questions inbox and email alerts",
    ],
  },
  {
    name: planData.starter.name,
    price: planData.starter.price,
    blurb: "We provide the AI.",
    points: [
      `${fmt(planData.starter.monthlyMessages)} Loriyum-AI messages / month`,
      "All 8 templates and custom colours",
      "Conversations, analytics and CSV export",
    ],
    featured: true,
  },
  {
    name: planData.pro.name,
    price: planData.pro.price,
    blurb: "For busy sites.",
    points: [
      `${fmt(planData.pro.monthlyMessages)} Loriyum-AI messages / month`,
      "Everything in Starter",
      "Room for several busy websites",
    ],
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="scroll-mt-20 py-24 sm:py-32">
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
                  ? "glow-border relative rounded-3xl p-7 glass shadow-glow md:-translate-y-3"
                  : "lift rounded-3xl p-7 glass"
              }
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-0.5 text-xs font-medium text-primary-foreground shadow-[0_6px_20px_-6px_var(--brand-via)]">
                  Most popular
                </span>
              ) : null}
              <h3 className="font-medium">{plan.name}</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span
                  className={`text-5xl font-semibold tracking-tight ${plan.featured ? "text-gradient" : ""}`}
                >
                  {plan.price}
                </span>
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
