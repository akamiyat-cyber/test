"use client";

import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { ReferenceImportFormat, ReferenceImportResponse } from "@/types/api";

export function ImportPanel() {
  const { addReferences } = useApp();
  const [format, setFormat] = useState<ReferenceImportFormat>("bibtex");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number; parseErrors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runImport() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/references/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, text }),
      });
      const data = (await res.json()) as ReferenceImportResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const before = data.items.length;
      const added = addReferences(data.items.map((csl) => ({ csl, source: format })));
      setResult({ added: added.length, skipped: before - added.length, parseErrors: data.errors });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
        {(["bibtex", "ris"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`flex-1 rounded px-2 py-1 font-medium ${format === f ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {f === "bibtex" ? "BibTeX (.bib)" : "RIS (.ris)"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">ファイル内容</label>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          ファイルを選択
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={format === "bibtex" ? ".bib,.bibtex" : ".ris"}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setText(await file.text());
            e.target.value = "";
          }}
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={format === "bibtex" ? "@article{...} を貼り付け..." : "TY  - JOUR ... を貼り付け..."}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs outline-none focus:border-indigo-400"
      />

      <button
        onClick={runImport}
        disabled={loading || !text.trim()}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "インポート中..." : "インポート"}
      </button>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p>
            {result.added}件をライブラリに追加しました
            {result.skipped > 0 && `（重複 ${result.skipped}件はスキップ）`}
          </p>
          {result.parseErrors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-amber-700">
              {result.parseErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
