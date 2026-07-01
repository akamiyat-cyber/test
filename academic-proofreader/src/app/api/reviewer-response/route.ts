import { NextRequest, NextResponse } from "next/server";
import { ANTHROPIC_MODEL, getAnthropicClient, getTextFromMessage } from "@/lib/anthropic";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildReviewerResponsePrompt } from "@/lib/prompt";

export const runtime = "nodejs";

interface ReviewerResponseRequestBody {
  reviewerComments: string;
  revisedText: string;
  journalId: string;
}

export async function POST(req: NextRequest) {
  let body: ReviewerResponseRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviewerComments, revisedText, journalId } = body;
  if (!reviewerComments || !reviewerComments.trim()) {
    return NextResponse.json({ error: "Reviewer comments are required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const { system, user } = buildReviewerResponsePrompt({
    reviewerComments,
    revisedText: revisedText || "",
    journal,
  });

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: user }],
    });
    return NextResponse.json({ response: getTextFromMessage(message).trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Claude API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
