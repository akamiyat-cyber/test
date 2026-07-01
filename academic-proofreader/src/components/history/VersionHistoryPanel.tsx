"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { diffWords } from "@/lib/textDiff";
import type { ProofreadMode } from "@/lib/types";

export function VersionHistoryPanel({ mode, currentText }: { mode: ProofreadMode; currentText: string }) {
  const { versions } = useApp();
  const [compareId, setCompareId] = useState<string | null>(null);

  const modeVersions = versions.filter((v) => v.mode === mode);

  if (modeVersions.length === 0) {
    return <p className="text-sm text-slate-400">まだ校正履歴がありません。校正を実行すると自動的に保存されます。</p>;
  }

  const compareVersion = modeVersions.find((v) => v.id === compareId) ?? null;
  const ops = compareVersion ? diffWords(compareVersion.revisedText, currentText || compareVersion.revisedText) : [];

  return (
    <div className="space-y-3">
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
        {modeVersions.map((v) => (
          <li key={v.id}>
            <button
              onClick={() => setCompareId((cur) => (cur === v.id ? null : v.id))}
              className={`w-full rounded border px-2 py-1.5 text-left hover:bg-slate-50 ${
                compareId === v.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
              }`}
            >
              <span className="font-medium text-slate-700">{v.label}</span>
              <span className="ml-2 text-slate-400">
                {v.corrections.length} corrections · {v.journalId}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {compareVersion && (
        <div className="rounded-md border border-slate-200 p-2.5 text-xs">
          <p className="mb-2 font-medium text-slate-600">
            この履歴 vs 現在のテキスト（削除=取り消し線 / 追加=下線）
          </p>
          <div className="whitespace-pre-wrap leading-6">
            {ops.map((op, i) => {
              if (op.type === "equal") return <span key={i}>{op.text}</span>;
              if (op.type === "delete")
                return (
                  <span key={i} className="text-rose-500 line-through decoration-rose-400">
                    {op.text}
                  </span>
                );
              return (
                <span key={i} className="text-emerald-700 underline decoration-emerald-500">
                  {op.text}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
