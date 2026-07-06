"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { StatsCheckResponse } from "@/types/api";

export function StatsCheckPanel() {
  const { mainText } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatsCheckResponse | null>(null);

  async function runCheck() {
    if (!mainText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: mainText }),
      });
      const data = (await res.json()) as StatsCheckResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Stats check failed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        p値・信頼区間・効果量・有効数字の表記に一貫性の問題がないかをチェックします(本文校正タブの原稿本文が対象)。
      </p>
      <button
        onClick={runCheck}
        disabled={loading || !mainText.trim()}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "チェック中..." : "統計報告チェックを実行"}
      </button>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {result && (
        <>
          {result.issues.length === 0 ? (
            <p className="text-sm text-slate-400">明らかな不整合は見つかりませんでした。</p>
          ) : (
            <ul className="space-y-2">
              {result.issues.map((issue, i) => (
                <li key={i} className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs">
                  <p className="font-medium text-amber-900">{issue.excerpt}</p>
                  <p className="mt-1 text-amber-800">{issue.issue}</p>
                  <p className="mt-1 text-amber-700">{issue.suggestion}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
