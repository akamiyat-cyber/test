import type { Guideline } from "@/lib/guidelines";
import type { JournalProfile } from "@/lib/journalProfiles";
import type { CompanionDocType, StatementType } from "@/types/api";

export function buildChecklistPrompt(params: { guideline: Guideline; text: string }): { system: string; user: string } {
  const { guideline, text } = params;
  const itemList = guideline.items.map((it) => `- id="${it.id}": ${it.label}${it.hint ? ` (${it.hint})` : ""}`).join("\n");

  const system = `You are an expert manuscript reviewer checking compliance with the ${guideline.name} (${guideline.fullName}) reporting guideline. For EACH checklist item, decide whether the manuscript text satisfies it. Return STRICT JSON only, no markdown fences, matching exactly:
{ "items": [{ "itemId": "string (copied verbatim from the input)", "status": "satisfied"|"partial"|"missing", "evidence": "string", "suggestion": "string" }] }
Include exactly one result per input item id, in the same order. "evidence" is a short quote/paraphrase from the text if found (empty string if missing). "suggestion" says what to add/fix to fully satisfy the item (empty string if already satisfied).`;

  const user = `Checklist items to verify:
${itemList}

Manuscript text:
--- TEXT START ---
${text}
--- TEXT END ---

Return the JSON now.`;

  return { system, user };
}

export function buildStatsCheckPrompt(params: { text: string }): { system: string; user: string } {
  const system = `You are a statistical-reporting reviewer. Scan the manuscript text for statistical statements (p-values, confidence intervals, effect sizes, sample sizes, significant figures) and flag INCONSISTENCIES or common reporting problems: mixed p-value formatting (e.g. "p<0.05" alongside "p = .001"), missing confidence intervals where effect sizes are reported, inconsistent decimal places/significant figures across similar statistics, exact p-values reported as "p=0.000" (should be "p<0.001"), or missing effect sizes alongside p-values. Return STRICT JSON only, no markdown fences, matching exactly:
{ "issues": [{ "excerpt": "string (exact quote)", "issue": "string", "suggestion": "string" }] }
Only flag genuine inconsistencies/problems within THIS text (e.g. two different p-value formats both appearing) — do not flag a single consistently-used format as a problem. If there are no statistical statements or no issues, return an empty array.`;

  const user = `Manuscript text:
--- TEXT START ---
${params.text}
--- TEXT END ---

Return the JSON now.`;

  return { system, user };
}

const STATEMENT_INSTRUCTIONS: Record<StatementType, string> = {
  "data-availability":
    "Write a standard \"Data Availability Statement\" for a manuscript, based on the provided details about where the data can be found and any access restrictions.",
  ethics:
    "Write a standard \"Ethics Statement\" (ethical approval / informed consent, as applicable) for a manuscript, based on the provided details about the subjects, approving committee, approval number, and consent.",
  coi: "Write a standard \"Conflict of Interest Statement\" for a manuscript, based on the provided details.",
  funding: "Write a standard \"Funding Statement\" for a manuscript, based on the provided details about funders, grant numbers, and the funder's role.",
};

export function buildStatementPrompt(params: {
  statementType: StatementType;
  formData: Record<string, string>;
  journal: JournalProfile;
}): { system: string; user: string } {
  const { statementType, formData, journal } = params;
  const system = `You are an academic writing assistant. ${STATEMENT_INSTRUCTIONS[statementType]} Output plain text only (no markdown/JSON) — 1-3 sentences, ready to paste into the manuscript. Follow common conventions for ${journal.name} submissions. If a detail wasn't provided, use standard neutral boilerplate for that case rather than inventing specifics.`;

  const details = Object.entries(formData)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const user = `Details provided:
${details || "(none provided)"}

Write the statement now.`;

  return { system, user };
}

export function buildTitleAbstractPrompt(params: { title: string; abstract: string; journal: JournalProfile }): {
  system: string;
  user: string;
} {
  const { title, abstract, journal } = params;
  const system = `You are an academic writing assistant specializing in manuscript discoverability (search engine / database indexing). Return STRICT JSON only, no markdown fences, matching exactly:
{ "titleSuggestions": [{ "title": "string", "reason": "string" }], "keywordSuggestions": ["string", ...], "abstractFeedback": "string" }
Propose 3-5 alternative titles that are more precise, keyword-rich, and discoverable while remaining accurate to the content; explain briefly why each is an improvement. Suggest 5-8 keywords suited for indexing/search. Give brief (2-4 sentence) feedback on the abstract's clarity, completeness, and searchability.`;

  const user = `Journal: ${journal.name}

Current title:
${title || "(none provided)"}

Current abstract:
${abstract || "(none provided)"}

Return the JSON now.`;

  return { system, user };
}

const COMPANION_DOC_INSTRUCTIONS: Record<CompanionDocType, string> = {
  "plain-language-summary":
    "Write a Plain Language Summary (~150-200 words) explaining the study's purpose, methods, and findings for a general, non-expert audience. Avoid jargon; explain any technical term you must use.",
  highlights:
    "Write 3-5 \"Highlights\" bullet points (each under 85 characters, per common journal requirements) summarizing the novel findings/contributions of the study.",
  "graphical-abstract-caption":
    "Write a short caption/description (2-4 sentences) for a graphical abstract that visually summarizes the study's core workflow and main finding — describe what such a figure should show, since no image is being generated here.",
  "suggested-reviewers":
    "Draft a short list of 3-4 suggested-reviewer profile descriptions (role/expertise area, not real names) that would be qualified to review this manuscript, with a one-sentence rationale each, plus a brief note on any potential reviewers to exclude (e.g. close collaborators) if evident from the text.",
};

export function buildCompanionDocPrompt(params: { docType: CompanionDocType; text: string; journal: JournalProfile }): {
  system: string;
  user: string;
} {
  const { docType, text, journal } = params;
  const system = `You are an academic writing assistant. ${COMPANION_DOC_INSTRUCTIONS[docType]} Output plain text only (no markdown/JSON). Journal: ${journal.name}.`;

  const user = `Manuscript text:
--- TEXT START ---
${text}
--- TEXT END ---

Write it now.`;

  return { system, user };
}
