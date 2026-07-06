"use client";

import { useApp } from "@/context/AppContext";
import { cslAuthorsText, cslYear } from "@/lib/references/csl";

const SOURCE_LABELS: Record<string, string> = {
  bibtex: "BibTeX",
  ris: "RIS",
  crossref: "Crossref",
  "semantic-scholar": "Semantic Scholar",
  pubmed: "PubMed",
  manual: "手動",
};

export function LibraryList() {
  const { references, citeReference, removeReference, citationOrder } = useApp();

  if (references.length === 0) {
    return <p className="text-sm text-slate-400">まだ参考文献がありません。インポートまたは検索から追加してください。</p>;
  }

  return (
    <ul className="space-y-2">
      {references.map((ref) => {
        const cited = citationOrder.includes(ref.id);
        return (
          <li key={ref.id} className="rounded-md border border-slate-200 p-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800">{ref.csl.title || "(no title)"}</p>
                <p className="mt-0.5 text-slate-500">
                  {cslAuthorsText(ref.csl) || "(no authors)"} {cslYear(ref.csl) ? `(${cslYear(ref.csl)})` : ""}
                </p>
                {ref.csl["container-title"] && <p className="text-slate-400 italic">{ref.csl["container-title"]}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {SOURCE_LABELS[ref.source] ?? ref.source}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => citeReference(ref)}
                className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
              >
                引用を挿入
              </button>
              {cited && <span className="text-[11px] text-emerald-600">引用済み</span>}
              <button
                onClick={() => removeReference(ref.id)}
                className="ml-auto text-[11px] text-slate-400 hover:text-rose-600"
              >
                削除
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
