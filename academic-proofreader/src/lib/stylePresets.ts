// Writing-style presets selectable in the toolbar. These are combined with the
// selected journal profile when building the Claude prompt (see prompt.ts).

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptInstruction: string;
}

export const stylePresets: StylePreset[] = [
  {
    id: "general-academic",
    name: "General Academic",
    description: "Balanced, formal academic English suitable for most manuscripts.",
    promptInstruction:
      "Write in clear, formal academic English. Favor precision over aggressive shortening; keep explanatory clauses when they aid understanding.",
  },
  {
    id: "concise",
    name: "Concise / Word-limit Focused",
    description: "Aggressively trims redundancy to help meet strict word limits.",
    promptInstruction:
      "Prioritize conciseness above all else. Remove redundant words/phrases, merge short sentences, and cut hedging language, even if it means restructuring sentences, as long as meaning is fully preserved. Aim to reduce word count wherever possible.",
  },
  {
    id: "formal-british",
    name: "Formal (British English)",
    description: "Formal academic tone using British English spelling and conventions.",
    promptInstruction:
      "Write in formal academic British English (e.g., 'colour', 'analyse', 'organisation'). Maintain a formal, impersonal-but-precise tone.",
  },
  {
    id: "formal-american",
    name: "Formal (American English)",
    description: "Formal academic tone using American English spelling and conventions.",
    promptInstruction:
      "Write in formal academic American English (e.g., 'color', 'analyze', 'organization'). Maintain a formal, impersonal-but-precise tone.",
  },
];

export function getStylePreset(id: string): StylePreset {
  return stylePresets.find((p) => p.id === id) ?? stylePresets[0];
}
