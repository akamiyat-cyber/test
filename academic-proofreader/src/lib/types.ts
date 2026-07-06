// Shared domain types for the academic English proofreader.

import type { CslItem } from "@/lib/references/csl";

export type CorrectionCategory =
  | "grammar"
  | "style"
  | "clarity"
  | "conciseness"
  | "consistency";

export type CorrectionStatus = "pending" | "accepted" | "rejected";

export interface Correction {
  id: string;
  original: string;
  revised: string;
  reason: string;
  reasonJa: string;
  category: CorrectionCategory;
  status: CorrectionStatus;
}

export interface ConsistencyIssue {
  id: string;
  term: string;
  variants: string[];
  suggestion: string;
}

/** Raw shape returned by the Claude proofreading API call, before client-side IDs/status are attached. */
export interface RawProofreadResult {
  corrections: Array<{
    original: string;
    revised: string;
    reason: string;
    reasonJa?: string;
    category: CorrectionCategory;
  }>;
  revisedFullText: string;
  wordCount: { current: number; limit: number };
  consistencyIssues: Array<{
    term: string;
    variants: string[];
    suggestion: string;
  }>;
}

export interface ProofreadResult {
  corrections: Correction[];
  revisedFullText: string;
  wordCount: { current: number; limit: number };
  consistencyIssues: ConsistencyIssue[];
}

export type ProofreadMode = "body" | "caption";

export type ReasonLanguage = "en" | "ja";

export interface WhitelistTerm {
  id: string;
  term: string;
  presetId?: string;
}

export interface WhitelistPreset {
  id: string;
  name: string;
  terms: string[];
}

export interface CommentItem {
  id: string;
  targetType: "correction" | "global";
  targetId?: string;
  targetLabel?: string;
  text: string;
  createdAt: number;
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  mode: ProofreadMode;
  journalId: string;
  stylePresetId: string;
  originalText: string;
  revisedText: string;
  corrections: Correction[];
  consistencyIssues: ConsistencyIssue[];
}

export interface DraftState {
  mainText: string;
  captionText: string;
  reviewerCommentsText: string;
  updatedAt: number;
}

export interface SettingsState {
  journalId: string;
  stylePresetId: string;
  reasonLanguage: ReasonLanguage;
}

export type ReferenceSource = "bibtex" | "ris" | "crossref" | "semantic-scholar" | "pubmed" | "manual";

/** A reference library entry: `id` is a local/DB row id, distinct from `csl.id` (the citation key). */
export interface LibraryReference {
  id: string;
  csl: CslItem;
  source: ReferenceSource;
}
