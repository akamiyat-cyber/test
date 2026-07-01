import type { CorrectionCategory } from "./types";

export const categoryLabels: Record<CorrectionCategory, { en: string; ja: string }> = {
  grammar: { en: "Grammar", ja: "文法" },
  style: { en: "Academic style", ja: "学術語彙・文体" },
  clarity: { en: "Clarity", ja: "明確さ" },
  conciseness: { en: "Conciseness", ja: "簡潔さ" },
  consistency: { en: "Consistency", ja: "一貫性" },
};

export const categoryBadgeClasses: Record<CorrectionCategory, string> = {
  grammar: "bg-rose-100 text-rose-700 border-rose-200",
  style: "bg-purple-100 text-purple-700 border-purple-200",
  clarity: "bg-sky-100 text-sky-700 border-sky-200",
  conciseness: "bg-amber-100 text-amber-700 border-amber-200",
  consistency: "bg-teal-100 text-teal-700 border-teal-200",
};
