// Request/response contracts for every API route. Confirmed before
// implementation per the project convention: routes must parse requests into
// these shapes and return exactly these shapes (or { error: string }).

import type { ProofreadMode, RawProofreadResult } from "@/lib/types";

// ---- POST /api/proofread ----
export interface ProofreadRequest {
  text: string;
  mode: ProofreadMode;
  journalId: string;
  stylePresetId: string;
  whitelist: string[];
}
export type ProofreadResponse = RawProofreadResult;

// ---- POST /api/cover-letter ----
export interface CoverLetterRequest {
  revisedText: string;
  journalId: string;
  title?: string;
  authorNotes?: string;
}
export interface CoverLetterResponse {
  letter: string;
}

// ---- POST /api/reviewer-response ----
export interface ReviewerResponseRequest {
  reviewerComments: string;
  revisedText: string;
  journalId: string;
}
export interface ReviewerResponseResponse {
  response: string;
}

// ---- POST /api/draft/outline ----
export interface OutlineRequest {
  notes: string;
  journalId: string;
}
export interface OutlineSection {
  heading: string;
  bullets: string[];
}
export interface OutlineResponse {
  sections: OutlineSection[];
}

// ---- POST /api/draft/section ----
export interface SectionDraftRequest {
  section: string;
  rhetoricalRole: string;
  notes: string;
  journalId: string;
  stylePresetId: string;
}
export interface SectionDraftResponse {
  draft: string;
}

// ---- POST /api/draft/paraphrase ----
export type ParaphraseMode = "paraphrase" | "compress";
export interface ParaphraseRequest {
  text: string;
  mode: ParaphraseMode;
  targetWordCount?: number;
  journalId: string;
  stylePresetId: string;
}
export interface ParaphraseResponse {
  result: string;
  wordCount: number;
}

export interface ApiError {
  error: string;
}
