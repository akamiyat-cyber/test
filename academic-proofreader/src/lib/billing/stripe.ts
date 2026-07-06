// Server-only Stripe wrapper (Phase 5 framework). Never import from client
// components — STRIPE_SECRET_KEY must not reach the browser bundle. Actual
// checkout/webhook processing requires real Stripe keys; without them,
// getClient() throws and callers (the /api/billing/* routes) turn that into
// a clear "billing not configured" response rather than a crash.

import "server-only";
import Stripe from "stripe";
import { getPlanDefinition } from "@/config/billing";

let client: Stripe | null = null;

function getClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set on the server.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const priceId = getPlanDefinition("pro").stripePriceId;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_PRO is not configured — create a Price in the Stripe Dashboard and set the env var.");
  }

  const session = await getClient().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.userEmail ?? undefined,
    client_reference_id: params.userId,
    metadata: { userId: params.userId },
    subscription_data: { metadata: { userId: params.userId } },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url };
}

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const session = await getClient().billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
  return { url: session.url };
}

/** Verifies and parses a Stripe webhook payload. Throws on a bad/missing signature. */
export function constructWebhookEvent(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set on the server.");
  return getClient().webhooks.constructEvent(payload, signature, secret);
}
