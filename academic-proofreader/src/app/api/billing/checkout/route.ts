import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/serverAuth";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { isStripeConfigured } from "@/config/env";
import type { CheckoutRequest, CheckoutResponse } from "@/types/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this server (STRIPE_SECRET_KEY not set)." },
      { status: 501 }
    );
  }

  const { userId, userEmail } = await resolveUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.successUrl || !body.cancelUrl) {
    return NextResponse.json({ error: "successUrl and cancelUrl are required." }, { status: 400 });
  }

  try {
    const { url } = await createCheckoutSession({
      userId,
      userEmail,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
    return NextResponse.json({ url } satisfies CheckoutResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error creating checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
