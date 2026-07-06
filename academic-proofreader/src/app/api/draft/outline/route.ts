import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/gemini";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildOutlinePrompt } from "@/lib/prompts/drafting";
import { outlineResponseSchema } from "@/schemas/gemini";
import type { OutlineRequest, OutlineResponse } from "@/types/api";

export const runtime = "nodejs";

function isValidOutline(value: unknown): value is OutlineResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.sections) &&
    v.sections.every(
      (s) =>
        s &&
        typeof s === "object" &&
        typeof (s as Record<string, unknown>).heading === "string" &&
        Array.isArray((s as Record<string, unknown>).bullets)
    )
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "ai", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: OutlineRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { notes, journalId } = body;
  if (!notes || !notes.trim()) {
    return NextResponse.json({ error: "Research notes are required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const { system, user } = buildOutlinePrompt({ notes, journal });

  try {
    const { data, usage } = await generateStructured<OutlineResponse>({
      systemInstruction: system,
      prompt: user,
      temperature: 0.3,
      responseSchema: outlineResponseSchema,
      validate: isValidOutline,
    });
    await recordUsage({ userId, route: "/api/draft/outline", usage });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
