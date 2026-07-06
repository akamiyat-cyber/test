import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { gateAiRequest } from "@/lib/aiGate";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildCoverLetterPrompt } from "@/lib/prompt";
import type { CoverLetterRequest, CoverLetterResponse } from "@/types/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId, blocked } = await gateAiRequest(req);
  if (blocked) return blocked;

  let body: CoverLetterRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { revisedText, journalId, title, authorNotes } = body;
  if (!revisedText || !revisedText.trim()) {
    return NextResponse.json({ error: "Manuscript text is required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const { system, user } = buildCoverLetterPrompt({ revisedText, journal, title, authorNotes });

  try {
    const { text, usage } = await generateText({
      systemInstruction: system,
      prompt: user,
      temperature: 0.4,
      maxOutputTokens: 2048,
    });
    await recordUsage({ userId, route: "/api/cover-letter", usage });
    return NextResponse.json({ letter: text.trim() } satisfies CoverLetterResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
