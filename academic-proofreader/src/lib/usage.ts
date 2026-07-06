// Usage metering hooks (Phase 0 groundwork; consumed by Phase 5's quota.ts).
// Records one row per AI call into usage_events via the service-role key.
// If Supabase (or the service key) isn't configured, metering degrades to a
// no-op so AI features keep working in local mode.

import "server-only";
import { getServiceSupabaseClient } from "@/lib/supabase/serviceClient";
import type { GeminiUsage } from "@/lib/ai/gemini";

export async function recordUsage(params: {
  userId: string | null;
  route: string;
  usage: GeminiUsage;
}): Promise<void> {
  const client = getServiceSupabaseClient();
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
