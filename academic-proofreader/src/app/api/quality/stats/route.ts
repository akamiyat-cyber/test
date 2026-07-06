import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { recordUsage } from "@/lib/usage";
import { buildStatsCheckPrompt } from "@/lib/prompts/quality";
import { statsCheckResponseSchema } from "@/schemas/gemini";
import type { StatsCheckRequest, StatsCheckResponse } from "@/types/api";

export const runtime = "nodejs";

function isValidStatsResult(value: unknown): value is StatsCheckResponse {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as Record<string, unknown>).issues);
}

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "ai", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: StatsCheckRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Manuscript text is required." }, { status: 400 });
  }

  const { system, user } = buildStatsCheckPrompt({ text });

  try {
    const { data, usage } = await generateStructured<StatsCheckResponse>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.1,
      responseSchema: statsCheckResponseSchema,
      validate: isValidStatsResult,
    });
    await recordUsage({ userId, route: "/api/quality/stats", usage });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
