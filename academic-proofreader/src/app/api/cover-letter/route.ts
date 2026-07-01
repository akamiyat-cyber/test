import { NextRequest, NextResponse } from "next/server";
import { ANTHROPIC_MODEL, getAnthropicClient, getTextFromMessage } from "@/lib/anthropic";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildCoverLetterPrompt } from "@/lib/prompt";

export const runtime = "nodejs";

interface CoverLetterRequestBody {
  revisedText: string;
  journalId: string;
  title?: string;
  authorNotes?: string;
}

export async function POST(req: NextRequest) {
  let body: CoverLetterRequestBody;
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
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: user }],
    });
    return NextResponse.json({ letter: getTextFromMessage(message).trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Claude API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
