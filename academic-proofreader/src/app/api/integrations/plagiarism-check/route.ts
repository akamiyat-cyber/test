import { NextRequest, NextResponse } from "next/server";
import { getPlagiarismCheckProvider } from "@/lib/integrations/plagiarismCheck";
import type { PlagiarismCheckRequest, PlagiarismCheckResponse } from "@/types/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const provider = getPlagiarismCheckProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error:
          "Plagiarism/AI-generated-text detection is not implemented in this app by design — see the comment in src/lib/integrations/plagiarismCheck.ts. Configure a real provider (e.g. Turnitin, iThenticate, Copyleaks, Originality.ai) there to enable this route.",
      },
      { status: 501 }
    );
  }

  let body: PlagiarismCheckRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const result = await provider.checkPlagiarism(body.text);
  return NextResponse.json(result satisfies PlagiarismCheckResponse);
}
