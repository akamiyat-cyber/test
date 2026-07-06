import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { gateAiRequest } from "@/lib/aiGate";
import { recordUsage } from "@/lib/usage";
import { buildReferenceCheckPrompt } from "@/lib/prompts/references";
import { referenceCheckResponseSchema } from "@/schemas/gemini";
import type { ReferenceCheckRequest, ReferenceCheckResponse } from "@/types/api";

export const runtime = "nodejs";

function isValidCheckResult(value: unknown): value is ReferenceCheckResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.uncitedReferences) && Array.isArray(v.unmatchedCitations);
}

export async function POST(req: NextRequest) {
  const { userId, blocked } = await gateAiRequest(req);
  if (blocked) return blocked;

  let body: ReferenceCheckRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, references } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Manuscript text is required." }, { status: 400 });
  }

  const { system, user } = buildReferenceCheckPrompt({ text, references: references ?? [] });

  try {
    const { data, usage } = await generateStructured<ReferenceCheckResponse>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.1,
      responseSchema: referenceCheckResponseSchema,
      validate: isValidCheckResult,
    });
    await recordUsage({ userId, route: "/api/references/check", usage });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
