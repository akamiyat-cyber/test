import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildTitleAbstractPrompt } from "@/lib/prompts/quality";
import { titleAbstractResponseSchema } from "@/schemas/gemini";
import type { TitleAbstractRequest, TitleAbstractResponse } from "@/types/api";

export const runtime = "nodejs";

function isValidResult(value: unknown): value is TitleAbstractResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.titleSuggestions) && Array.isArray(v.keywordSuggestions) && typeof v.abstractFeedback === "string";
}

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "ai", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: TitleAbstractRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, abstract, journalId } = body;
  if (!title?.trim() && !abstract?.trim()) {
    return NextResponse.json({ error: "Provide at least a title or an abstract." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const { system, user } = buildTitleAbstractPrompt({ title: title || "", abstract: abstract || "", journal });

  try {
    const { data, usage } = await generateStructured<TitleAbstractResponse>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.5,
      responseSchema: titleAbstractResponseSchema,
      validate: isValidResult,
    });
    await recordUsage({ userId, route: "/api/quality/title-abstract", usage });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
