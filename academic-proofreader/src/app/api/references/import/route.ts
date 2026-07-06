import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponseBody } from "@/lib/rateLimit";
import { resolveUser } from "@/lib/serverAuth";
import { parseBibtex } from "@/lib/references/bibtex";
import { parseRis } from "@/lib/references/ris";
import type { ReferenceImportRequest, ReferenceImportResponse } from "@/types/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await resolveUser(req);
  const limit = checkRateLimit(req, "external", userId);
  if (!limit.allowed) {
    return NextResponse.json(rateLimitResponseBody(limit), { status: 429 });
  }

  let body: ReferenceImportRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { format, text } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "File text is required." }, { status: 400 });
  }
  if (format !== "bibtex" && format !== "ris") {
    return NextResponse.json({ error: "format must be \"bibtex\" or \"ris\"." }, { status: 400 });
  }

  const { items, errors } = format === "bibtex" ? parseBibtex(text) : parseRis(text);
  return NextResponse.json({ items, errors } satisfies ReferenceImportResponse);
}
