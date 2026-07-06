"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

export function PlagiarismCheckPanel() {
  const { mainText } = useApp();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/plagiarism-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: mainText }),
      });
      const data = await res.json();
      setMessage(res.ok ? JSON.stringify(data) : data.error);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <p className="font-semibold">未実装(意図的)</p>
        <p className="mt-1">
          剽窃チェック・AI生成テキスト検出は、このアプリでは自前実装しません。信頼できる判定には専用ベンダー(Turnitin、iThenticate、Copyleaks、Originality.aiなど)との連携が必要なため、外部サービス連携用のインターフェースのみ用意しています(
          <code className="rounded bg-white px-1">src/lib/integrations/plagiarismCheck.ts</code>)。下のボタンは実際にAPIを叩いて「未実装」応答が返ることを確認できます。
        </p>
      </div>

      <button
        onClick={run}
        disabled={loading || !mainText.trim()}
        className="rounded-md border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        {loading ? "確認中..." : "APIを試す(未実装応答を確認)"}
      </button>

      {message && <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>}
    </div>
  );
}
