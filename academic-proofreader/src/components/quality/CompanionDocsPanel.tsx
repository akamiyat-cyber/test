"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { CompanionDocType } from "@/types/api";

const DOC_TYPES: { id: CompanionDocType; label: string }[] = [
  { id: "plain-language-summary", label: "Plain Language Summary" },
  { id: "highlights", label: "Highlights" },
  { id: "graphical-abstract-caption", label: "グラフィカルアブストラクト文案" },
  { id: "suggested-reviewers", label: "推奨査読者草案" },
];

export function CompanionDocsPanel() {
  const { mainText, journalId } = useApp();
  const [docType, setDocType] = useState<CompanionDocType>("plain-language-summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");

  async function generate() {
    if (!mainText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/companion-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, text: mainText, journalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {DOC_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setDocType(t.id);
              setResult("");
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              docType === t.id ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={loading || !mainText.trim()}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "生成中..." : "生成する"}
      </button>
      {!mainText.trim() && <p className="text-[11px] text-slate-400">本文校正タブなどで原稿本文を入力してから実行してください。</p>}
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {result && (
        <div className="rounded-md border border-slate-200 p-2.5">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{result}</p>
          <button
            onClick={() => navigator.clipboard.writeText(result)}
            className="mt-2 rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
