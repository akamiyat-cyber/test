import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { getStylePreset } from "@/lib/stylePresets";
import { buildSectionDraftPrompt } from "@/lib/prompts/drafting";
import type { SectionDraftRequest, SectionDraftResponse } from "@/types/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "ai", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: SectionDraftRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { section, rhetoricalRole, notes, journalId, stylePresetId } = body;
  if (!section || !rhetoricalRole) {
    return NextResponse.json({ error: "section and rhetoricalRole are required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const style = getStylePreset(stylePresetId);
  const { system, user } = buildSectionDraftPrompt({ section, rhetoricalRole, notes: notes || "", journal, style });

  try {
    const { text, usage } = await generateText({
      systemInstruction: system,
      prompt: user,
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
    await recordUsage({ userId, route: "/api/draft/section", usage });
    return NextResponse.json({ draft: text.trim() } satisfies SectionDraftResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
