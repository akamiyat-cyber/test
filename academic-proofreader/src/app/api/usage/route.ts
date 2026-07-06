import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/serverAuth";
import { checkPlanQuota } from "@/lib/quota";
import { isStripeConfigured } from "@/config/env";
import type { UsageResponse } from "@/types/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { userId } = await resolveUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to view usage." }, { status: 401 });
  }

  const quota = await checkPlanQuota(userId);
  const response: UsageResponse = {
    plan: quota.plan,
    used: quota.used,
    limit: Number.isFinite(quota.limit) ? quota.limit : null,
    billingEnabled: isStripeConfigured(),
  };
  return NextResponse.json(response);
}
