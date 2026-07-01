import { NextRequest, NextResponse } from "next/server";
import { ANTHROPIC_MODEL, extractJSON, getAnthropicClient, getTextFromMessage } from "@/lib/anthropic";
import { getJournalProfile } from "@/lib/journalProfiles";
import { getStylePreset } from "@/lib/stylePresets";
import { buildProofreadPrompt } from "@/lib/prompt";
import type { ProofreadMode, RawProofreadResult } from "@/lib/types";

export const runtime = "nodejs";

interface ProofreadRequestBody {
  text: string;
  mode: ProofreadMode;
  journalId: string;
  stylePresetId: string;
  whitelist: string[];
}

function isValidRawResult(value: unknown): value is RawProofreadResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.corrections) &&
    typeof v.revisedFullText === "string" &&
    typeof v.wordCount === "object" &&
    v.wordCount !== null &&
    Array.isArray(v.consistencyIssues)
  );
}

export async function POST(req: NextRequest) {
  let body: ProofreadRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, mode, journalId, stylePresetId, whitelist } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const journal = getJournalProfile(journalId);
  const style = getStylePreset(stylePresetId);
  const { system, user } = buildProofreadPrompt({
    mode: mode === "caption" ? "caption" : "body",
    text,
    journal,
    style,
    whitelist: Array.isArray(whitelist) ? whitelist : [],
  });

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    });

    const raw = extractJSON(getTextFromMessage(message));
    if (!isValidRawResult(raw)) {
      return NextResponse.json(
        { error: "Model response did not match the expected schema." },
        { status: 502 }
      );
    }

    return NextResponse.json(raw satisfies RawProofreadResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Claude API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
