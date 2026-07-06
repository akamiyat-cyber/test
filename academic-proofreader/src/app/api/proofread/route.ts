import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { gateAiRequest } from "@/lib/aiGate";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { getStylePreset } from "@/lib/stylePresets";
import { buildProofreadPrompt } from "@/lib/prompt";
import { proofreadResponseSchema } from "@/schemas/gemini";
import type { ProofreadRequest, ProofreadResponse } from "@/types/api";
import type { RawProofreadResult } from "@/lib/types";

export const runtime = "nodejs";

function isValidRawResult(value: unknown): value is RawProofreadResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.corrections) &&
    typeof v.revisedFullText === "string" &&
    typeof v.wordCount === "object" &&
    v.wordCount !== null &&
    Array.isArray(v.consistencyIssues)
  );
}

export async function POST(req: NextRequest) {
  const { userId, blocked } = await gateAiRequest(req);
  if (blocked) return blocked;

  let body: ProofreadRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, mode, journalId, stylePresetId, whitelist } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const style = getStylePreset(stylePresetId);
  const { system, user } = buildProofreadPrompt({
    mode: mode === "caption" ? "caption" : "body",
    text,
    journal,
    style,
    whitelist: Array.isArray(whitelist) ? whitelist : [],
  });

  try {
    const { data, usage } = await generateStructured<RawProofreadResult>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.2,
      responseSchema: proofreadResponseSchema,
      validate: isValidRawResult,
    });
    await recordUsage({ userId, route: "/api/proofread", usage });
    return NextResponse.json(data satisfies ProofreadResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
