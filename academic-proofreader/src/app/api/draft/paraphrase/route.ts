import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { getStylePreset } from "@/lib/stylePresets";
import { buildParaphrasePrompt } from "@/lib/prompts/drafting";
import { paraphraseResponseSchema } from "@/schemas/gemini";
import type { ParaphraseRequest, ParaphraseResponse } from "@/types/api";

export const runtime = "nodejs";

function isValidParaphrase(value: unknown): value is ParaphraseResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.result === "string" && typeof v.wordCount === "number";
}

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "ai", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: ParaphraseRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, mode, targetWordCount, journalId, stylePresetId } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const style = getStylePreset(stylePresetId);
  const { system, user } = buildParaphrasePrompt({
    text,
    mode: mode === "compress" ? "compress" : "paraphrase",
    targetWordCount,
    journal,
    style,
  });

  try {
    const { data, usage } = await generateStructured<ParaphraseResponse>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.3,
      responseSchema: paraphraseResponseSchema,
      validate: isValidParaphrase,
    });
    await recordUsage({ userId, route: "/api/draft/paraphrase", usage });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
