// Gemini model IDs, centralized so they can be swapped without touching
// feature code. Model names/pricing/rate limits change over time — check
// https://ai.google.dev/gemini-api/docs/models for the current lineup before
// changing these. (Last verified: 2026-07. gemini-3.5-flash is GA and the
// recommended price/performance default; gemini-2.5-pro remains the stable
// high-reasoning option.)

/** Default model for all AI features. Override per-deployment with GEMINI_MODEL. */
export const GEMINI_MODEL_DEFAULT = "gemini-3.5-flash";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || GEMINI_MODEL_DEFAULT;
}
