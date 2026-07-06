// Gemini responseSchema definitions, one per structured-output feature.
// These are enforced by the API itself (responseMimeType: "application/json"
// + responseSchema), so route handlers can trust the parsed shape after a
// light runtime guard. Keep each schema in sync with its type in src/types/.

import { Type, type Schema } from "@google/genai";

/** Matches RawProofreadResult in src/lib/types.ts. */
export const proofreadResponseSchema: Schema = {
  type: Type.OBJECT,
  required: ["corrections", "revisedFullText", "wordCount", "consistencyIssues"],
  properties: {
    corrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["original", "revised", "reason", "reasonJa", "category"],
        properties: {
          original: {
            type: Type.STRING,
            description:
              "Exact verbatim substring of the source text (same spacing/punctuation), as short as possible while unambiguous.",
          },
          revised: { type: Type.STRING, description: "The corrected/improved text." },
          reason: { type: Type.STRING, description: "Brief reason for the change, in English." },
          reasonJa: { type: Type.STRING, description: "The same reason in natural Japanese." },
          category: {
            type: Type.STRING,
            enum: ["grammar", "style", "clarity", "conciseness", "consistency"],
          },
        },
      },
    },
    revisedFullText: {
      type: Type.STRING,
      description: "The full text with ALL corrections applied.",
    },
    wordCount: {
      type: Type.OBJECT,
      required: ["current", "limit"],
      properties: {
        current: { type: Type.INTEGER, description: "Word count of the ORIGINAL source text." },
        limit: { type: Type.INTEGER, description: "The word limit given in the instructions (0 if none)." },
      },
    },
    consistencyIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["term", "variants", "suggestion"],
        properties: {
          term: { type: Type.STRING, description: "Canonical term." },
          variants: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestion: {
            type: Type.STRING,
            description: "Which form to standardize on and why.",
          },
        },
      },
    },
  },
};

/** Matches OutlineResponse in src/types/api.ts. */
export const outlineResponseSchema: Schema = {
  type: Type.OBJECT,
  required: ["sections"],
  properties: {
    sections: {
      type: Type.ARRAY,
      description: "IMRaD-ordered sections (e.g. Introduction, Methods, Results, Discussion).",
      items: {
        type: Type.OBJECT,
        required: ["heading", "bullets"],
        properties: {
          heading: { type: Type.STRING, description: "Section heading." },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Key points to cover in this section, as short bullet phrases.",
          },
        },
      },
    },
  },
};

/** Matches ParaphraseResponse in src/types/api.ts. */
export const paraphraseResponseSchema: Schema = {
  type: Type.OBJECT,
  required: ["result", "wordCount"],
  properties: {
    result: { type: Type.STRING, description: "The paraphrased or compressed text." },
    wordCount: { type: Type.INTEGER, description: "Word count of `result`." },
  },
};
