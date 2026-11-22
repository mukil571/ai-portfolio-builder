/** Simulated plans (no payment gateway). Quotas are real: they're enforced on chat. */
export const planIds = ["free", "starter", "pro"] as const;
export type PlanId = (typeof planIds)[number];

export const plans: Record<
  PlanId,
  { name: string; price: string; monthlyMessages: number; blurb: string }
> = {
  free: {
    name: "Free",
    price: "$0",
    monthlyMessages: 50,
    blurb: "Try the assistant, or bring your own AI key for unlimited chats.",
  },
  starter: {
    name: "Starter",
    price: "$9",
    monthlyMessages: 1_000,
    blurb: "For a personal site or small business.",
  },
  pro: {
    name: "Pro",
    price: "$29",
    monthlyMessages: 10_000,
    blurb: "For busy sites and several websites.",
  },
};

export const PERIOD_DAYS = 30;
