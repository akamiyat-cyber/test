import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/serverAuth";
import { createBillingPortalSession } from "@/lib/billing/stripe";
import { getServiceSupabaseClient } from "@/lib/supabase/serviceClient";
import { isStripeConfigured } from "@/config/env";
import type { PortalRequest, PortalResponse } from "@/types/api";
import type { ProfileRow } from "@/types/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this server (STRIPE_SECRET_KEY not set)." },
      { status: 501 }
    );
  }

  const { userId } = await resolveUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: PortalRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.returnUrl) {
    return NextResponse.json({ error: "returnUrl is required." }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured on this server." }, { status: 501 });
  }

  const { data } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
  const customerId = (data as Pick<ProfileRow, "stripe_customer_id"> | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account found for this user yet." }, { status: 404 });
  }

  try {
    const { url } = await createBillingPortalSession({ customerId, returnUrl: body.returnUrl });
    return NextResponse.json({ url } satisfies PortalResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error creating billing portal session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
