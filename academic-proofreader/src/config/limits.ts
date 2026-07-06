// Rate limit and plan quota configuration. Plan quotas are enforced in
// src/lib/quota.ts (Phase 5), looked up from profiles.plan and checked
// against usage_events aggregates recorded by src/lib/usage.ts (Phase 0).

export interface RateLimitRule {
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Max requests per window per key (user id or IP). */
  max: number;
}

/** Per-route-category limits. AI routes are the expensive ones. */
export const rateLimits: Record<"ai" | "external", RateLimitRule> = {
  // Gemini-backed routes: generous enough for interactive editing, tight
  // enough that a runaway loop or shared-IP abuse can't burn the API budget.
  ai: { windowMs: 60_000, max: 10 },
  // Crossref / Semantic Scholar / PubMed proxy routes (Phase 2).
  external: { windowMs: 60_000, max: 30 },
};

/** Plan quotas (Phase 5). Checked against usage_events aggregates. */
export const planQuotas = {
  free: { aiRequestsPerDay: 50 },
  pro: { aiRequestsPerDay: 1000 },
} as const;

export type PlanId = keyof typeof planQuotas;
