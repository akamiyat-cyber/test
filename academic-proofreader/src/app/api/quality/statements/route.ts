import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { gateAiRequest } from "@/lib/aiGate";
import { recordUsage } from "@/lib/usage";
import { getJournalProfile } from "@/lib/journalProfiles";
import { buildStatementPrompt } from "@/lib/prompts/quality";
import type { StatementRequest, StatementResponse, StatementType } from "@/types/api";

export const runtime = "nodejs";

const VALID_TYPES: StatementType[] = ["data-availability", "ethics", "coi", "funding"];

export async function POST(req: NextRequest) {
  const { userId, blocked } = await gateAiRequest(req);
  if (blocked) return blocked;

  let body: StatementRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { statementType, formData, journalId } = body;
  if (!VALID_TYPES.includes(statementType)) {
    return NextResponse.json({ error: `Unknown statementType "${statementType}".` }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const { system, user } = buildStatementPrompt({ statementType, formData: formData ?? {}, journal });

  try {
    const { text, usage } = await generateText({
      systemInstruction: system,
      prompt: user,
      temperature: 0.3,
      maxOutputTokens: 512,
    });
    await recordUsage({ userId, route: "/api/quality/statements", usage });
    return NextResponse.json({ statement: text.trim() } satisfies StatementResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Gemini API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
