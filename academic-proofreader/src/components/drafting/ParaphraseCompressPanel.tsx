"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { countWords } from "@/lib/wordCount";
import type { ParaphraseMode } from "@/types/api";

export function ParaphraseCompressPanel() {
  const { journalId, stylePresetId, getMainSelectionRange, insertIntoMainText, replaceMainRange, mainText } = useApp();
  const [mode, setMode] = useState<ParaphraseMode>("paraphrase");
  const [sourceText, setSourceText] = useState("");
  const [targetWordCount, setTargetWordCount] = useState<number>(0);
  const [capturedRange, setCapturedRange] = useState<{ start: number; end: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; wordCount: number } | null>(null);

  function loadSelection() {
    const range = getMainSelectionRange();
    if (range) {
      const selected = mainText.slice(range.start, range.end);
      setSourceText(selected);
      setTargetWordCount(Math.max(5, Math.round(countWords(selected) * 0.7)));
      setCapturedRange(range);
    }
  }

  async function run() {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          mode,
          targetWordCount: mode === "compress" ? targetWordCount : undefined,
          journalId,
          stylePresetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Paraphrase request failed.");
      setResult({ text: data.result, wordCount: data.wordCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
        {([
          ["paraphrase", "言い換え（保守的）"],
          ["compress", "語数圧縮"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 rounded px-2 py-1 font-medium ${mode === id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">対象テキスト</label>
        <button
          onClick={loadSelection}
          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          本文の選択範囲を読み込む
        </button>
      </div>
      <textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        rows={5}
        placeholder="本文で範囲を選択して「読み込む」を押すか、ここに直接貼り付けてください..."
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
      />
      <p className="text-[11px] text-slate-400">現在の語数: {countWords(sourceText)}</p>

      {mode === "compress" && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">目標語数</label>
          <input
            type="number"
            min={1}
            value={targetWordCount || ""}
            onChange={(e) => setTargetWordCount(Number(e.target.value) || 0)}
            className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </div>
      )}

      <button
        onClick={run}
        disabled={loading || !sourceText.trim()}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "処理中..." : "実行"}
      </button>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {result && (
        <div className="rounded-md border border-slate-200 p-2.5">
          <p className="mb-1 text-[11px] text-slate-400">結果: {result.wordCount} words</p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{result.text}</p>
          {capturedRange ? (
            <p className="mt-2 text-[11px] text-amber-600">
              「置き換える」は「読み込む」を押した時点の本文範囲（{capturedRange.end - capturedRange.start}文字）を置き換えます。
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400">選択範囲を読み込んでいないため、カーソル位置に挿入されます。</p>
          )}
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => (capturedRange ? replaceMainRange(capturedRange, result.text) : insertIntoMainText(result.text))}
              className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
            >
              {capturedRange ? "選択範囲を置き換える" : "本文へ挿入"}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(result.text)}
              className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
