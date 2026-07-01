// Journal-specific style/format profiles.
//
// To add a new journal, append a new entry to `journalProfiles` below.
// Every field is used both to steer the Claude prompt (see prompt.ts) and to
// render the reference panel in the UI, so keep descriptions short and concrete.

export interface JournalProfile {
  id: string;
  name: string;
  styleGuidelines: {
    /** Free-text description of expected active-voice usage. */
    activeVoice: string;
    firstPersonAllowed: boolean;
    firstPersonNote: string;
    sentenceLength: string;
  };
  /** Reference-only heading structure, shown in the UI, not enforced. */
  headingTemplate: string[];
  referenceStyle: {
    summary: string;
    /** e.g. "et al. after 2 authors" */
    etAlRule: string;
  };
  wordLimits: {
    abstract: number | null;
    mainText: number | null;
    figureCaption: number | null;
  };
}

export const journalProfiles: JournalProfile[] = [
  {
    id: "general",
    name: "General",
    styleGuidelines: {
      activeVoice: "Balanced use of active and passive voice; prefer active where it improves clarity.",
      firstPersonAllowed: true,
      firstPersonNote: "\"We\" is acceptable when it clarifies who performed an action.",
      sentenceLength: "Moderate length; prioritize clarity over strict brevity.",
    },
    headingTemplate: [
      "Title",
      "Abstract",
      "Introduction",
      "Materials and Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "References",
    ],
    referenceStyle: {
      summary: "No specific house style enforced; follow a consistent, recognized citation format.",
      etAlRule: "Use journal-agnostic judgment (commonly et al. after 2-3 authors).",
    },
    wordLimits: { abstract: null, mainText: null, figureCaption: null },
  },
  {
    id: "nature",
    name: "Nature",
    styleGuidelines: {
      activeVoice: "Strong preference for active voice and direct, concise statements.",
      firstPersonAllowed: true,
      firstPersonNote: "\"We\" is standard and encouraged over passive constructions.",
      sentenceLength: "Short, punchy sentences; avoid long compound/run-on sentences.",
    },
    headingTemplate: [
      "Title",
      "Abstract",
      "Main",
      "Methods",
      "Data Availability",
      "References",
      "Acknowledgements",
      "Author Contributions",
      "Competing Interests",
    ],
    referenceStyle: {
      summary: "Numbered, superscript citation style; reference list in citation order, not alphabetical.",
      etAlRule: "List all authors up to 5; use et al. beyond 5 authors.",
    },
    wordLimits: { abstract: 150, mainText: 3000, figureCaption: 350 },
  },
  {
    id: "science",
    name: "Science",
    styleGuidelines: {
      activeVoice: "Prefers active voice; direct, declarative sentence structure.",
      firstPersonAllowed: true,
      firstPersonNote: "\"We\" is standard for describing the authors' actions.",
      sentenceLength: "Concise sentences; avoid nested clauses where possible.",
    },
    headingTemplate: [
      "Title",
      "Abstract",
      "Introduction",
      "Results",
      "Discussion",
      "Materials and Methods",
      "References and Notes",
      "Acknowledgments",
    ],
    referenceStyle: {
      summary: "Numbered citation style in order of appearance; compact reference formatting.",
      etAlRule: "List up to 5 authors; et al. beyond 5.",
    },
    wordLimits: { abstract: 125, mainText: 2500, figureCaption: 300 },
  },
  {
    id: "pnas",
    name: "PNAS",
    styleGuidelines: {
      activeVoice: "Active voice preferred for describing author actions and findings.",
      firstPersonAllowed: true,
      firstPersonNote: "\"We\" is acceptable and common.",
      sentenceLength: "Moderate length, favoring clarity and a formal academic register.",
    },
    headingTemplate: [
      "Title",
      "Significance Statement",
      "Abstract",
      "Introduction",
      "Results",
      "Discussion",
      "Materials and Methods",
      "References",
    ],
    referenceStyle: {
      summary: "Numbered citations; PNAS reference style with abbreviated journal names.",
      etAlRule: "List up to 5 authors; et al. beyond 5.",
    },
    wordLimits: { abstract: 250, mainText: 6000, figureCaption: 350 },
  },
  {
    id: "plos-one",
    name: "PLOS ONE",
    styleGuidelines: {
      activeVoice: "Active voice encouraged, but clarity takes priority over strict active/passive rules.",
      firstPersonAllowed: true,
      firstPersonNote: "\"We\" is standard and widely used.",
      sentenceLength: "Clear, moderate-length sentences; plain language encouraged.",
    },
    headingTemplate: [
      "Title",
      "Abstract",
      "Introduction",
      "Materials and Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "Supporting Information",
      "References",
    ],
    referenceStyle: {
      summary: "Vancouver numbered style; reference list in citation order.",
      etAlRule: "List all authors when feasible; et al. permitted for very large author lists.",
    },
    wordLimits: { abstract: 300, mainText: null, figureCaption: null },
  },
  {
    id: "bioinformatics",
    name: "Bioinformatics",
    styleGuidelines: {
      activeVoice: "Active voice preferred, especially in Methods and Results sections.",
      firstPersonAllowed: true,
      firstPersonNote: "\"We\" is standard for describing implementation and analysis steps.",
      sentenceLength: "Technical, precise sentences; avoid unnecessary hedging or verbosity.",
    },
    headingTemplate: [
      "Title",
      "Abstract",
      "1 Introduction",
      "2 Materials and Methods",
      "3 Results",
      "4 Discussion",
      "Funding",
      "References",
    ],
    referenceStyle: {
      summary: "Author-year (Harvard) style in text; alphabetical reference list.",
      etAlRule: "Use et al. after 2 authors in-text; list all authors in the reference list.",
    },
    wordLimits: { abstract: 250, mainText: null, figureCaption: null },
  },
];

export function getJournalProfile(id: string): JournalProfile {
  return journalProfiles.find((p) => p.id === id) ?? journalProfiles[0];
}
