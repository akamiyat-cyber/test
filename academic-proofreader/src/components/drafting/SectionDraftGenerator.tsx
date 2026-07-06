"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { draftableSections, getSectionRhetoricalRoles } from "@/lib/prompts/drafting";

export function SectionDraftGenerator() {
  const { journalId, stylePresetId, insertIntoMainText } = useApp();
  const [section, setSection] = useState(draftableSections[0]);
  const [role, setRole] = useState(getSectionRhetoricalRoles(draftableSections[0])[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const roles = getSectionRhetoricalRoles(section);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, rhetoricalRole: role, notes, journalId, stylePresetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Section draft generation failed.");
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">セクション</label>
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              setRole(getSectionRhetoricalRoles(e.target.value)[0]);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          >
            {draftableSections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">修辞的役割</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">メモ・キーポイント（任意）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="この段落に含めたい具体的な内容があれば入力してください..."
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
      </div>
      <button
        onClick={generate}
        disabled={loading}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "生成中..." : "下書き生成"}
      </button>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {draft && (
        <div className="rounded-md border border-slate-200 p-2.5">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{draft}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => insertIntoMainText(draft)}
              className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
            >
              本文へ挿入
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(draft)}
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
