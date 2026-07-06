// Plan-based daily quota enforcement (Phase 5), layered on top of the
// sliding-window rate limiter from Phase 0 (lib/rateLimit.ts). The rate
// limiter protects against bursts/abuse per minute; this protects the
// free/pro daily AI-request allowance from config/limits.ts.
//
// Anonymous requests (no authenticated user) are NOT quota-checked here —
// they're already governed by the IP-based sliding-window limiter, and
// without a user id there's no plan to look up. Quotas only apply once
// Supabase is configured; in local mode (no Supabase) this always allows,
// exactly like the rest of the app degrading gracefully without a DB.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseClient } from "@/lib/supabase/serviceClient";
import { planQuotas, type PlanId } from "@/config/limits";

export interface QuotaResult {
  allowed: boolean;
  plan: PlanId;
  used: number;
  limit: number;
}

async function getUserPlan(client: SupabaseClient, userId: string): Promise<PlanId> {
  const { data } = await client.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const plan = (data as { plan?: string } | null)?.plan;
  return plan === "pro" ? "pro" : "free";
}

const UNLIMITED: QuotaResult = { allowed: true, plan: "free", used: 0, limit: Infinity };

/** Checks (and does NOT itself record) the caller's usage against their plan's daily AI-request quota. */
export async function checkPlanQuota(userId: string | null): Promise<QuotaResult> {
  if (!userId) return UNLIMITED;

  const client = getServiceSupabaseClient();
  if (!client) return UNLIMITED;

  try {
    const plan = await getUserPlan(client, userId);
    const limit = planQuotas[plan].aiRequestsPerDay;

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count, error } = await client
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since.toISOString());

    if (error) return { allowed: true, plan, used: 0, limit };
    const used = count ?? 0;
    return { allowed: used < limit, plan, used, limit };
  } catch {
    // Quota checks must fail open — metering/billing issues should never block a user's request.
    return UNLIMITED;
  }
}
