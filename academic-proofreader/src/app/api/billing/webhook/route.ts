import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { getServiceSupabaseClient } from "@/lib/supabase/serviceClient";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  // Signature verification needs the raw body — never JSON.parse before this.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    // Nothing to update without Supabase configured; acknowledge so Stripe doesn't retry forever.
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              plan: "pro",
              stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
              stripe_subscription_id:
                typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null),
              subscription_status: "active",
            })
            .eq("id", userId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        const update = {
          plan: isActive ? "pro" : "free",
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        };
        if (userId) {
          await supabase.from("profiles").update(update).eq("id", userId);
        } else {
          const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
          await supabase.from("profiles").update(update).eq("stripe_customer_id", customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch {
    // A transient DB error shouldn't turn into repeated Stripe webhook
    // retries for an event we already verified and received correctly.
  }

  return NextResponse.json({ received: true });
}
