import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { gateAiRequest } from "@/lib/aiGate";
import { recordUsage } from "@/lib/usage";
import { getGuideline } from "@/lib/guidelines";
import { buildChecklistPrompt } from "@/lib/prompts/quality";
import { qualityChecklistResponseSchema } from "@/schemas/gemini";
import type { QualityChecklistRequest, QualityChecklistResponse } from "@/types/api";

export const runtime = "nodejs";

function isValidChecklistResult(value: unknown): value is QualityChecklistResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.items);
}

export async function POST(req: NextRequest) {
  const { userId, blocked } = await gateAiRequest(req);
  if (blocked) return blocked;

  let body: QualityChecklistRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { guidelineId, text } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Manuscript text is required." }, { status: 400 });
  }
  const guideline = getGuideline(guidelineId);
  if (!guideline) {
    return NextResponse.json({ error: `Unknown guideline "${guidelineId}".` }, { status: 400 });
  }

  const { system, user } = buildChecklistPrompt({ guideline, text });

  try {
    const { data, usage } = await generateStructured<QualityChecklistResponse>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.1,
      responseSchema: qualityChecklistResponseSchema,
      validate: isValidChecklistResult,
    });
    await recordUsage({ userId, route: "/api/quality/checklist", usage });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
