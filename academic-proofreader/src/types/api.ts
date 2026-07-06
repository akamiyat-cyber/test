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

export interface ApiError {
  error: string;
}
