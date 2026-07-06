"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { generateId } from "@/lib/id";
import type { OutlineResponse } from "@/types/api";

interface EditableSection {
  id: string;
  heading: string;
  bulletsText: string;
}

function formatSection(section: EditableSection): string {
  const bullets = section.bulletsText
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  return `## ${section.heading}\n${bullets.map((b) => `- ${b}`).join("\n")}\n`;
}

export function OutlineGenerator() {
  const { journalId, insertIntoMainText } = useApp();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<EditableSection[] | null>(null);

  async function generate() {
    if (!notes.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, journalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Outline generation failed.");
      const outline = data as OutlineResponse;
      setSections(
        outline.sections.map((s) => ({
          id: generateId("sec"),
          heading: s.heading,
          bulletsText: s.bullets.join("\n"),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  function updateSection(id: string, patch: Partial<EditableSection>) {
    setSections((prev) => prev?.map((s) => (s.id === id ? { ...s, ...patch } : s)) ?? prev);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">研究メモ・キーポイント</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="研究の目的、方法、主要な結果、着目してほしい点などを箇条書き/自由記述で入力してください..."
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
      </div>
      <button
        onClick={generate}
        disabled={loading || !notes.trim()}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "生成中..." : "アウトライン生成 (IMRaD)"}
      </button>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {sections && sections.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => insertIntoMainText(sections.map(formatSection).join("\n"))}
              className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
            >
              すべて本文へ挿入
            </button>
          </div>
          {sections.map((s) => (
            <div key={s.id} className="rounded-md border border-slate-200 p-2.5">
              <input
                value={s.heading}
                onChange={(e) => updateSection(s.id, { heading: e.target.value })}
                className="mb-1.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400"
              />
              <textarea
                value={s.bulletsText}
                onChange={(e) => updateSection(s.id, { bulletsText: e.target.value })}
                rows={Math.max(2, s.bulletsText.split("\n").length)}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs leading-6 outline-none focus:border-indigo-400"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  onClick={() => insertIntoMainText(formatSection(s))}
                  className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  このセクションを挿入
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
