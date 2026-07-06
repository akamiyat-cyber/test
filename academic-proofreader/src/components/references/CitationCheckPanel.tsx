"use client";

import { useApp } from "@/context/AppContext";

export function CitationCheckPanel() {
  const { runReferenceCheck, loadingReferenceCheck, errorReferenceCheck, referenceCheckResult, references } = useApp();

  return (
    <div className="space-y-3">
      <button
        onClick={runReferenceCheck}
        disabled={loadingReferenceCheck || references.length === 0}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loadingReferenceCheck ? "チェック中..." : "引用チェックを実行"}
      </button>
      {references.length === 0 && <p className="text-[11px] text-slate-400">ライブラリに参考文献を追加してから実行してください。</p>}
      {errorReferenceCheck && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorReferenceCheck}</div>
      )}

      {referenceCheckResult && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">
              未引用の参考文献 ({referenceCheckResult.uncitedReferences.length})
            </p>
            {referenceCheckResult.uncitedReferences.length === 0 ? (
              <p className="text-xs text-slate-400">すべての参考文献が本文で引用されています。</p>
            ) : (
              <ul className="space-y-1.5">
                {referenceCheckResult.uncitedReferences.map((r) => (
                  <li key={r.id} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    {r.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">
              ライブラリと一致しない引用 ({referenceCheckResult.unmatchedCitations.length})
            </p>
            {referenceCheckResult.unmatchedCitations.length === 0 ? (
              <p className="text-xs text-slate-400">未解決の引用マーカーは見つかりませんでした。</p>
            ) : (
              <ul className="space-y-1.5">
                {referenceCheckResult.unmatchedCitations.map((c, i) => (
                  <li key={i} className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
                    <span className="font-medium">{c.citationText}</span>
                    <p className="mt-0.5 text-rose-600">…{c.context}…</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
