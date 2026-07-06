// Sliding-window rate limiter, Phase 0 framework.
//
// In-memory implementation: sufficient for a single Next.js server process.
// For multi-instance deployments swap `MemoryRateLimitStore` for a Redis/
// Upstash-backed store implementing the same `RateLimitStore` interface —
// callers only depend on `checkRateLimit`.

import type { NextRequest } from "next/server";
import { rateLimits, type RateLimitRule } from "@/config/limits";

interface RateLimitStore {
  /** Records a hit and returns the number of hits within the window. */
  hit(key: string, windowMs: number): number;
}

class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>();

  hit(key: string, windowMs: number): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    timestamps.push(now);
    this.hits.set(key, timestamps);
    // Opportunistic cleanup so the map doesn't grow unboundedly.
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => t <= cutoff)) this.hits.delete(k);
      }
    }
    return timestamps.length;
  }
}

const store: RateLimitStore = new MemoryRateLimitStore();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  rule: RateLimitRule;
}

/**
 * Rate-limits by authenticated user id when available, otherwise by client IP.
 * Category selects the rule from config/limits.ts.
 */
export function checkRateLimit(
  req: NextRequest,
  category: keyof typeof rateLimits,
  userId: string | null
): RateLimitResult {
  const rule = rateLimits[category];
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = `${category}:${userId ? `user:${userId}` : `ip:${ip}`}`;
  const count = store.hit(key, rule.windowMs);
  return { allowed: count <= rule.max, remaining: Math.max(0, rule.max - count), rule };
}

export function rateLimitResponseBody(result: RateLimitResult): { error: string } {
  return {
    error: `Rate limit exceeded: max ${result.rule.max} requests per ${Math.round(result.rule.windowMs / 1000)}s. Please wait and retry.`,
  };
}
