import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildReviewerResponsePrompt } from "@/lib/prompt";
import type { ReviewerResponseRequest, ReviewerResponseResponse } from "@/types/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "ai", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: ReviewerResponseRequest;
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
    const { text, usage } = await generateText({
      systemInstruction: system,
      prompt: user,
      temperature: 0.4,
      maxOutputTokens: 4096,
    });
    await recordUsage({ userId, route: "/api/reviewer-response", usage });
    return NextResponse.json({ response: text.trim() } satisfies ReviewerResponseResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
