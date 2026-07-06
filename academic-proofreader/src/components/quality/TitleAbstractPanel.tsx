"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { TitleAbstractResponse } from "@/types/api";

export function TitleAbstractPanel() {
  const { journalId, insertIntoMainText } = useApp();
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TitleAbstractResponse | null>(null);

  async function run() {
    if (!title.trim() && !abstract.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/title-abstract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, abstract, journalId }),
      });
      const data = (await res.json()) as TitleAbstractResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">現在のタイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="論文タイトルを入力..."
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">現在の要旨</label>
        <textarea
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          rows={5}
          placeholder="要旨を貼り付け..."
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
      </div>

      <button
        onClick={run}
        disabled={loading || (!title.trim() && !abstract.trim())}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "分析中..." : "改善案を生成"}
      </button>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {result && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">タイトル改善案</p>
            <ul className="space-y-1.5">
              {result.titleSuggestions.map((s, i) => (
                <li key={i} className="rounded-md border border-slate-200 p-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-800">{s.title}</p>
                    <button
                      onClick={() => insertIntoMainText(s.title)}
                      className="shrink-0 rounded border border-indigo-300 px-1.5 py-0.5 text-[10px] text-indigo-700 hover:bg-indigo-50"
                    >
                      挿入
                    </button>
                  </div>
                  <p className="mt-0.5 text-slate-500">{s.reason}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">キーワード候補</p>
            <div className="flex flex-wrap gap-1.5">
              {result.keywordSuggestions.map((k, i) => (
                <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {k}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">要旨へのフィードバック</p>
            <p className="text-xs leading-6 text-slate-700">{result.abstractFeedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}
