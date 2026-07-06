// Usage metering hooks (Phase 0 groundwork for Phase 5 quotas/billing).
// Records one row per AI call into usage_events via the service-role key.
// If Supabase (or the service key) isn't configured, metering degrades to a
// no-op so AI features keep working in local mode.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GeminiUsage } from "@/lib/ai/gemini";

let serviceClient: SupabaseClient | null | undefined;

function getServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) return serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  serviceClient =
    url && serviceKey
      ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return serviceClient;
}

export async function recordUsage(params: {
  userId: string | null;
  route: string;
  usage: GeminiUsage;
}): Promise<void> {
  const client = getServiceClient();
  if (!client) return;
  try {
    await client.from("usage_events").insert({
      user_id: params.userId,
      route: params.route,
      model: params.usage.model,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
    });
  } catch {
    // Metering must never break the user-facing request.
  }
}
