// Single entry point every Gemini-backed route calls before doing any AI
// work: resolves the caller, applies the sliding-window rate limit, then the
// plan-based daily quota. Centralizing this means every AI route enforces
// both consistently instead of each route hand-rolling the same three calls.

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { checkPlanQuota } from "@/lib/quota";

export interface AiGateResult {
  userId: string | null;
  /** Non-null if the request should be rejected immediately with this response. */
  blocked: NextResponse | null;
}

export async function gateAiRequest(req: NextRequest): Promise<AiGateResult> {
  const { userId } = await resolveUser(req);

  const rate = checkRateLimit(req, "ai", userId);
  if (!rate.allowed) {
    return { userId, blocked: NextResponse.json(rateLimitResponseBody(rate), { status: 429 }) };
  }

  const quota = await checkPlanQuota(userId);
  if (!quota.allowed) {
    return {
      userId,
      blocked: NextResponse.json(
        {
          error: `Daily AI usage limit reached (${quota.used}/${quota.limit} requests on the ${quota.plan} plan). It resets at midnight, or upgrade your plan for a higher limit.`,
        },
        { status: 429 }
      ),
    };
  }

  return { userId, blocked: null };
}
