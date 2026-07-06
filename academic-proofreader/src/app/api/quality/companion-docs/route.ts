import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { gateAiRequest } from "@/lib/aiGate";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildCompanionDocPrompt } from "@/lib/prompts/quality";
import type { CompanionDocRequest, CompanionDocResponse, CompanionDocType } from "@/types/api";

export const runtime = "nodejs";

const VALID_TYPES: CompanionDocType[] = [
  "plain-language-summary",
  "highlights",
  "graphical-abstract-caption",
  "suggested-reviewers",
];

export async function POST(req: NextRequest) {
  const { userId, blocked } = await gateAiRequest(req);
  if (blocked) return blocked;

  let body: CompanionDocRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { docType, text, journalId } = body;
  if (!VALID_TYPES.includes(docType)) {
    return NextResponse.json({ error: `Unknown docType "${docType}".` }, { status: 400 });
  }
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Manuscript text is required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const { system, user } = buildCompanionDocPrompt({ docType, text, journal });

  try {
    const { text: result, usage } = await generateText({
      systemInstruction: system,
      prompt: user,
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
    await recordUsage({ userId, route: "/api/quality/companion-docs", usage });
    return NextResponse.json({ result: result.trim() } satisfies CompanionDocResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
