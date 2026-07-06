"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { cslAuthorsText, cslYear } from "@/lib/references/csl";
import type { ReferenceSearchResponse, ReferenceSearchSource } from "@/types/api";

const SOURCES: { id: ReferenceSearchSource; label: string }[] = [
  { id: "crossref", label: "Crossref" },
  { id: "semantic-scholar", label: "Semantic Scholar" },
  { id: "pubmed", label: "PubMed" },
];

export function SearchPanel() {
  const { addReferences, citeReference } = useApp();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<ReferenceSearchSource[]>(SOURCES.map((s) => s.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReferenceSearchResponse["results"]>([]);
  const [sourceErrors, setSourceErrors] = useState<ReferenceSearchResponse["sourceErrors"]>([]);
  const [addedKeys, setAddedKeys] = useState<Set<number>>(new Set());

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAddedKeys(new Set());
    try {
      const params = new URLSearchParams({ q: query, sources: sources.join(","), limit: "8" });
      const res = await fetch(`/api/references/search?${params.toString()}`);
      const data = (await res.json()) as ReferenceSearchResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results);
      setSourceErrors(data.sourceErrors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSource(id: ReferenceSearchSource) {
    setSources((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <label key={s.id} className="flex items-center gap-1 text-[11px] text-slate-600">
            <input type="checkbox" checked={sources.includes(s.id)} onChange={() => toggleSource(s.id)} />
            {s.label}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="タイトル・著者名・キーワードで検索..."
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
        <button
          onClick={runSearch}
          disabled={loading || !query.trim() || sources.length === 0}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {loading ? "検索中..." : "検索"}
        </button>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {sourceErrors.length > 0 && (
        <p className="text-[11px] text-amber-600">
          一部のソースで検索に失敗しました: {sourceErrors.map((e) => e.source).join(", ")}
        </p>
      )}

      {results.length === 0 && !loading ? (
        <p className="text-sm text-slate-400">検索結果はここに表示されます。</p>
      ) : (
        <ul className="space-y-2">
          {results.map((r, i) => (
            <li key={i} className="rounded-md border border-slate-200 p-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{r.item.title || "(no title)"}</p>
                  <p className="mt-0.5 text-slate-500">
                    {cslAuthorsText(r.item) || "(no authors)"} {cslYear(r.item) ? `(${cslYear(r.item)})` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {SOURCES.find((s) => s.id === r.source)?.label ?? r.source}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    const [added] = addReferences([{ csl: r.item, source: r.source }]);
                    citeReference(added);
                    setAddedKeys((prev) => new Set(prev).add(i));
                  }}
                  className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  ライブラリに追加して引用
                </button>
                <button
                  onClick={() => {
                    addReferences([{ csl: r.item, source: r.source }]);
                    setAddedKeys((prev) => new Set(prev).add(i));
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  ライブラリに追加のみ
                </button>
                {addedKeys.has(i) && <span className="text-[11px] text-emerald-600">追加済み</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
