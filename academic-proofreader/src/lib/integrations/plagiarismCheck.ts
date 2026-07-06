// Plagiarism / AI-generated-text detection: INTENTIONALLY NOT IMPLEMENTED.
//
// This module defines the integration *contract* a real provider would plug
// into — it deliberately does not implement one. Building a reliable,
// legally-defensible similarity/AI-detection engine in-house is out of scope
// for this app:
//   - False positives have real consequences (misconduct/retraction
//     accusations), so accuracy bars are much higher than a typical feature.
//   - The credible tools (Turnitin, iThenticate, Copyleaks, Originality.ai,
//     GPTZero, ...) are trained on proprietary corpora/institutional
//     agreements we can't replicate, and license terms generally prohibit
//     building a competing checker on top of scraped comparisons.
//   - Getting this wrong is worse than not offering it at all.
//
// When a real vendor integration is wanted, implement PlagiarismCheckProvider
// against that vendor's API and return it from getPlagiarismCheckProvider().
// Until then it returns null, and POST /api/integrations/plagiarism-check
// responds 501 rather than fabricating a result.

export interface PlagiarismMatch {
  matchedText: string;
  sourceUrl?: string;
  sourceTitle?: string;
  similarityPercent: number;
}

export interface PlagiarismCheckResult {
  overallSimilarityPercent: number;
  matches: PlagiarismMatch[];
  provider: string;
}

export interface AiDetectionResult {
  aiGeneratedProbability: number; // 0-1
  provider: string;
}

export interface PlagiarismCheckProvider {
  name: string;
  checkPlagiarism(text: string): Promise<PlagiarismCheckResult>;
  /** Optional: not every provider offers AI-generated-text detection. */
  checkAiGenerated?(text: string): Promise<AiDetectionResult>;
}

/** No provider is configured — see the module comment above. */
export function getPlagiarismCheckProvider(): PlagiarismCheckProvider | null {
  return null;
}
