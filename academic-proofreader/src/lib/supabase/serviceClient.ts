// Service-role Supabase client: bypasses RLS entirely. Only for server-only
// modules that must read/write across users (usage metering, quota checks,
// the Stripe webhook) — never expose this client or its key to the browser.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** Null when Supabase isn't configured (SUPABASE_SERVICE_ROLE_KEY absent) — local mode. */
export function getServiceSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client =
    url && serviceKey
      ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return client;
}
