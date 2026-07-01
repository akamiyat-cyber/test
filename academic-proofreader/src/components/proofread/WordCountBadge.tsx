import { countWords } from "@/lib/wordCount";

export function WordCountBadge({ text, limit }: { text: string; limit: number | null }) {
  const current = countWords(text);
  const overLimit = !!limit && current > limit;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
        overLimit
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {current} {limit ? `/ ${limit} words` : "words"}
      {overLimit && <span className="font-semibold">超過</span>}
    </span>
  );
}
