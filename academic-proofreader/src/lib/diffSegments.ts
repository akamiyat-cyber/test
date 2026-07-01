// Builds an ordered list of "plain text" / "tracked change" segments by
// locating each correction's `original` snippet inside the source text.
// This is a simplified, LLM-oriented diff: rather than a general text diff
// (e.g. LCS/Myers), we trust the corrections array (grounded in the source
// text by the prompt contract) and sequentially locate each snippet, which
// keeps rendering fast and predictable for the track-changes view.

import type { Correction } from "./types";

export interface PlainSegment {
  type: "plain";
  key: string;
  text: string;
}

export interface CorrectionSegment {
  type: "correction";
  key: string;
  correction: Correction;
}

export type DiffSegment = PlainSegment | CorrectionSegment;

export function buildDiffSegments(
  sourceText: string,
  corrections: Correction[]
): { segments: DiffSegment[]; unlocated: Correction[] } {
  const segments: DiffSegment[] = [];
  const unlocated: Correction[] = [];
  let cursor = 0;

  corrections.forEach((correction, i) => {
    if (!correction.original) {
      unlocated.push(correction);
      return;
    }
    let idx = sourceText.indexOf(correction.original, cursor);
    if (idx === -1) {
      // Fall back to searching the whole text in case corrections arrived
      // out of order relative to the source.
      idx = sourceText.indexOf(correction.original);
    }
    if (idx === -1) {
      unlocated.push(correction);
      return;
    }
    if (idx > cursor) {
      segments.push({ type: "plain", key: `plain-${i}-${cursor}`, text: sourceText.slice(cursor, idx) });
    }
    segments.push({ type: "correction", key: `correction-${correction.id}`, correction });
    cursor = idx + correction.original.length;
  });

  if (cursor < sourceText.length) {
    segments.push({ type: "plain", key: `plain-tail-${cursor}`, text: sourceText.slice(cursor) });
  }

  return { segments, unlocated };
}

/** Computes the resulting plain text given each correction's current status. */
export function computeFinalText(sourceText: string, corrections: Correction[]): string {
  const { segments } = buildDiffSegments(sourceText, corrections);
  return segments
    .map((seg) => {
      if (seg.type === "plain") return seg.text;
      return seg.correction.status === "rejected" ? seg.correction.original : seg.correction.revised;
    })
    .join("");
}
