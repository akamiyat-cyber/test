import type { JournalProfile } from "@/lib/journalProfiles";
import type { StylePreset } from "@/lib/stylePresets";
import type { ParaphraseMode } from "@/types/api";

export function buildOutlinePrompt(params: { notes: string; journal: JournalProfile }): {
  system: string;
  user: string;
} {
  const { notes, journal } = params;
  const system = `You are an academic writing assistant that turns a researcher's raw notes/key points into an IMRaD-structured manuscript outline. Return STRICT JSON only, no markdown fences, matching exactly:
{ "sections": [{ "heading": "string", "bullets": ["string", ...] }] }
Rules: produce sections in this order (skip a section only if the notes clearly don't apply): Introduction, Methods, Results, Discussion — optionally preceded by Abstract and followed by Conclusion. Each section's bullets are short, concrete phrases (not full sentences) describing what that section should cover, grounded in the user's notes. 3-6 bullets per section.`;

  const user = `Target journal: ${journal.name} (heading conventions: ${journal.headingTemplate.join(" → ")})

Researcher's notes / key points:
--- NOTES START ---
${notes}
--- NOTES END ---

Generate the outline JSON now.`;

  return { system, user };
}

const SECTION_RHETORICAL_ROLES: Record<string, string[]> = {
  Introduction: [
    "Establish the research background/context",
    "Identify a gap in prior research",
    "State the aim/purpose of the study",
    "Outline the structure of the paper",
  ],
  Methods: [
    "Describe study design and participants/materials",
    "Describe the procedure",
    "Describe data analysis / statistical approach",
    "Justify a methodological choice",
  ],
  Results: [
    "Report a key finding",
    "Present descriptive statistics",
    "Compare conditions/groups",
    "Refer to a figure or table",
  ],
  Discussion: [
    "Interpret the main finding",
    "Compare with prior literature",
    "Acknowledge a limitation",
    "State an implication",
    "Suggest future research",
  ],
};

export function getSectionRhetoricalRoles(section: string): string[] {
  return SECTION_RHETORICAL_ROLES[section] ?? [];
}

export const draftableSections = Object.keys(SECTION_RHETORICAL_ROLES);

export function buildSectionDraftPrompt(params: {
  section: string;
  rhetoricalRole: string;
  notes: string;
  journal: JournalProfile;
  style: StylePreset;
}): { system: string; user: string } {
  const { section, rhetoricalRole, notes, journal, style } = params;
  const system = `You are an academic writing assistant drafting one paragraph of a manuscript's "${section}" section, whose rhetorical purpose here is: "${rhetoricalRole}". Output plain text only (no markdown/JSON) — just the paragraph, ready to paste into the manuscript. Write in formal academic English following the journal's style guidelines. ${style.promptInstruction}`;

  const user = `Journal: ${journal.name}
Active voice: ${journal.styleGuidelines.activeVoice}
First person: ${journal.styleGuidelines.firstPersonAllowed ? "allowed" : "avoid"} — ${journal.styleGuidelines.firstPersonNote}
Sentence length: ${journal.styleGuidelines.sentenceLength}

Author's notes / key points to incorporate (may be brief or in Japanese/English mixed):
--- NOTES START ---
${notes || "(no additional notes provided — write a generic but plausible paragraph for this rhetorical role)"}
--- NOTES END ---

Write one paragraph for the "${section}" section fulfilling: ${rhetoricalRole}.`;

  return { system, user };
}

export function buildParaphrasePrompt(params: {
  text: string;
  mode: ParaphraseMode;
  targetWordCount?: number;
  journal: JournalProfile;
  style: StylePreset;
}): { system: string; user: string } {
  const { text, mode, targetWordCount, journal, style } = params;
  const instruction =
    mode === "compress"
      ? `Compress the text to approximately ${targetWordCount ?? Math.max(10, Math.round(text.trim().split(/\s+/).length * 0.7))} words while preserving all essential meaning and technical accuracy. Cut redundancy and merge clauses; do not omit any factual claim.`
      : "Paraphrase the text conservatively: preserve the exact meaning, technical terms, and claims, but vary the wording/sentence structure enough that it reads as a distinct rewrite. Do not change the approximate length by more than 15%.";

  const system = `You are an academic editing assistant. Return STRICT JSON only, no markdown fences, matching exactly: { "result": "string", "wordCount": 0 }. "result" is the rewritten text; "wordCount" is the word count of "result". Journal style: ${journal.name}. ${style.promptInstruction}`;

  const user = `${instruction}

--- SOURCE TEXT START ---
${text}
--- SOURCE TEXT END ---`;

  return { system, user };
}
