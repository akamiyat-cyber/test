import type { ReferenceCheckRequest } from "@/types/api";

export function buildReferenceCheckPrompt(params: Pick<ReferenceCheckRequest, "text" | "references">): {
  system: string;
  user: string;
} {
  const { text, references } = params;

  const system = `You are an academic citation-checking assistant. Given a manuscript's text and its bibliography (reference library), identify two kinds of problems. Return STRICT JSON only, no markdown fences, matching exactly:
{ "uncitedReferences": [{ "id": "string", "title": "string" }], "unmatchedCitations": [{ "citationText": "string", "context": "string" }] }

"uncitedReferences": references from the supplied library whose author/year/title are never referenced anywhere in the text (by name, year, or an in-text marker like "[3]" or superscript number). Copy the "id" field verbatim from the input list.

"unmatchedCitations": citation-like markers found in the text (author-date parentheticals, bracketed/superscript numbers, or "Author et al." mentions that read as citations) that do NOT correspond to any reference in the supplied library — i.e. likely missing from the bibliography. For each, include the exact citation text and a short surrounding context snippet so it can be located.

Do not flag a reference as uncited if it is referenced under a clearly recognizable variant of its authors/year (fuzzy matching is expected — citation styles vary).`;

  const refList = references
    .map((r, i) => `${i + 1}. id="${r.id}" | ${r.authorsText || "(no authors)"} (${r.year ?? "n.d."}) — ${r.title}`)
    .join("\n");

  const user = `Reference library (${references.length} entries):
${refList || "(empty — the library has no references yet)"}

Manuscript text:
--- TEXT START ---
${text}
--- TEXT END ---

Return the JSON now.`;

  return { system, user };
}
