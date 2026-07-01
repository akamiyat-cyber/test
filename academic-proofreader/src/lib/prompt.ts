import type { JournalProfile } from "./journalProfiles";
import type { StylePreset } from "./stylePresets";
import type { ProofreadMode } from "./types";

const JSON_SCHEMA_INSTRUCTIONS = `Return your analysis as STRICT JSON only — no markdown code fences, no commentary before or after. The JSON MUST match exactly this shape:

{
  "corrections": [
    {
      "original": "the exact original substring, verbatim, copy-pasted from the source text",
      "revised": "the corrected/improved substring",
      "reason": "brief reason for the change, in English",
      "reasonJa": "the same reason, translated into natural Japanese",
      "category": "grammar" | "style" | "clarity" | "conciseness" | "consistency"
    }
  ],
  "revisedFullText": "the full text with ALL corrections applied",
  "wordCount": { "current": 0, "limit": 0 },
  "consistencyIssues": [
    { "term": "canonical term", "variants": ["variant1", "variant2"], "suggestion": "which form to standardize on and why" }
  ]
}

Rules for "corrections":
- "original" must be an exact, verbatim substring of the source text supplied by the user (same spacing/punctuation) so it can be located programmatically. Keep each "original" snippet as short as possible while still being unambiguous (usually a phrase or sentence, not a whole paragraph).
- List corrections in the order they appear in the source text.
- Do not include a correction entry for a whitelisted term unless the surrounding grammar (not the term itself) needs fixing.
- If there are no issues, return an empty "corrections" array and set "revisedFullText" equal to the source text.

Rules for "wordCount":
- "current" is the word count of the ORIGINAL source text supplied by the user.
- "limit" is the numeric word limit provided in the instructions below (0 if none was given).

Rules for "consistencyIssues":
- Flag abbreviations used without an evident first-use definition, and terms with inconsistent spelling/phrasing/capitalization variants (e.g. "AWD" vs "alternate wetting and drying" used interchangeably).
- This check applies even to whitelisted terms — whitelisting only exempts a term from being rewritten, not from consistency analysis.`;

function whitelistBlock(whitelist: string[]): string {
  if (whitelist.length === 0) return "None.";
  return whitelist.map((t) => `"${t}"`).join(", ");
}

export function buildProofreadPrompt(params: {
  mode: ProofreadMode;
  text: string;
  journal: JournalProfile;
  style: StylePreset;
  whitelist: string[];
}): { system: string; user: string } {
  const { mode, text, journal, style, whitelist } = params;
  const limit =
    mode === "caption" ? journal.wordLimits.figureCaption : journal.wordLimits.mainText;

  const system = `You are an expert academic English editor specializing in manuscripts for peer-reviewed scientific journals, in the style of a professional proofreading service (e.g., Paperpal, Editage). You analyze text for:
1. Grammar and spelling mistakes.
2. Academic register: rewrite colloquial/informal wording into formal academic vocabulary and phrasing.
3. Conciseness: simplify redundant/wordy expressions without losing meaning.
4. Voice and tense consistency: flag inappropriate/inconsistent passive-active voice or inconsistent verb tense.
5. Word/phrase repetition: flag unnecessary repeated words close together and suggest variation.

${JSON_SCHEMA_INSTRUCTIONS}`;

  const modeInstruction =
    mode === "caption"
      ? "The text below consists of ONE OR MORE figure/table captions. Treat each caption independently but apply the same correction categories. Caption text is often terse by convention — do not flag normal caption terseness (e.g., sentence fragments after the label) as a grammar error."
      : "The text below is the main manuscript body (or a section of it).";

  const user = `Journal: ${journal.name}
Style guidelines for this journal:
- Active voice: ${journal.styleGuidelines.activeVoice}
- First person ("we"): ${journal.styleGuidelines.firstPersonAllowed ? "allowed" : "avoid"} — ${journal.styleGuidelines.firstPersonNote}
- Sentence length tendency: ${journal.styleGuidelines.sentenceLength}

Writing style preset: ${style.name}
${style.promptInstruction}

Word limit for this text: ${limit ?? 0} (0 means no specific limit)

Whitelisted terms (do NOT rewrite/flag these terms themselves; leave them exactly as written, but do check surrounding grammar and consistency of usage): ${whitelistBlock(whitelist)}

${modeInstruction}

Reason language: always populate both "reason" (English) and "reasonJa" (Japanese) for every correction.

--- SOURCE TEXT START ---
${text}
--- SOURCE TEXT END ---`;

  return { system, user };
}

export function buildCoverLetterPrompt(params: {
  revisedText: string;
  journal: JournalProfile;
  title?: string;
  authorNotes?: string;
}): { system: string; user: string } {
  const { revisedText, journal, title, authorNotes } = params;
  const system = `You are an experienced academic writing assistant who drafts cover letters for manuscript submissions to peer-reviewed journals. Write in formal, professional English. Output plain text only (no markdown, no JSON, no code fences) — just the letter body, ready to paste into a submission portal.`;

  const user = `Draft a cover letter to the Editor of "${journal.name}" for the manuscript below.
${title ? `Manuscript title: ${title}` : ""}
${authorNotes ? `Additional author notes to incorporate: ${authorNotes}` : ""}

The letter should:
- Address "Dear Editor,"
- Briefly state the manuscript's topic and main finding.
- Explain the novelty/significance and why it fits the scope of ${journal.name}.
- Confirm the work is original and not under consideration elsewhere (standard boilerplate).
- Close professionally, with a placeholder signature line "[Corresponding Author Name]".
- Stay under ~400 words.

Manuscript (revised) text to summarize:
--- MANUSCRIPT START ---
${revisedText}
--- MANUSCRIPT END ---`;

  return { system, user };
}

export function buildReviewerResponsePrompt(params: {
  reviewerComments: string;
  revisedText: string;
  journal: JournalProfile;
}): { system: string; user: string } {
  const { reviewerComments, revisedText, journal } = params;
  const system = `You are an academic writing assistant helping authors draft a "Response to Reviewers" document for a manuscript revision submitted to "${journal.name}". Output plain text only (no markdown, no JSON, no code fences).`;

  const user = `Reviewer comments (may include multiple reviewers, numbered or unlabeled):
--- REVIEWER COMMENTS START ---
${reviewerComments}
--- REVIEWER COMMENTS END ---

Revised manuscript text (for reference, to ground the responses in what was actually changed):
--- REVISED MANUSCRIPT START ---
${revisedText}
--- REVISED MANUSCRIPT END ---

Task: Produce a point-by-point "Response to Reviewers" draft:
- Group by reviewer (Reviewer 1, Reviewer 2, ...) if distinguishable, otherwise use sequential numbering.
- For each comment: quote/paraphrase the comment briefly (prefixed "Comment:"), then provide a courteous, specific response (prefixed "Response:") describing how the manuscript was revised, referencing concrete changes where plausible given the revised text.
- Keep a professional, appreciative tone throughout.`;

  return { system, user };
}
