import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { searchAllProviders } from "@/lib/references/providers";
import type { ReferenceSearchResponse, ReferenceSearchSource } from "@/types/api";

export const runtime = "nodejs";

const VALID_SOURCES: ReferenceSearchSource[] = ["crossref", "semantic-scholar", "pubmed"];

export async function GET(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "external", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
  }

  const limitParam = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "5", 10) || 5, 1), 10);
  const sourcesParam = searchParams.get("sources");
  const sources = sourcesParam
    ? (sourcesParam.split(",").map((s) => s.trim()) as ReferenceSearchSource[]).filter((s) => VALID_SOURCES.includes(s))
    : undefined;

  try {
    const { results, sourceErrors } = await searchAllProviders(q, limitParam, sources);
    return NextResponse.json({ results, sourceErrors } satisfies ReferenceSearchResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error searching literature APIs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
