// Stripe plan configuration (Phase 5 framework). This only describes plans
// and where to find their Stripe Price id — it never talks to Stripe
// directly (see src/lib/billing/stripe.ts) and doesn't require real Stripe
// keys to import. Real checkout requires STRIPE_SECRET_KEY + STRIPE_PRICE_PRO
// (a Price created in the Stripe Dashboard) to be set; until then, upgrade
// is simply disabled (see isStripeConfigured() in config/env.ts).

import type { PlanId } from "./limits";
import { planQuotas } from "./limits";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number | null;
  aiRequestsPerDay: number;
  /** Stripe Price id for this plan's subscription (e.g. "price_123"). Undefined -> upgrade unavailable even if Stripe is otherwise configured. */
  stripePriceId: string | undefined;
}

export const plans: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    aiRequestsPerDay: planQuotas.free.aiRequestsPerDay,
    stripePriceId: undefined,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 19,
    aiRequestsPerDay: planQuotas.pro.aiRequestsPerDay,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
];

export function getPlanDefinition(id: PlanId): PlanDefinition {
  return plans.find((p) => p.id === id) ?? plans[0];
}
