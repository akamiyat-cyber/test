"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { guidelines } from "@/lib/guidelines";
import type { ChecklistItemStatus, QualityChecklistResponse } from "@/types/api";

const STATUS_LABELS: Record<ChecklistItemStatus, { label: string; cls: string }> = {
  satisfied: { label: "対応済み", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  partial: { label: "一部対応", cls: "border-amber-300 bg-amber-50 text-amber-700" },
  missing: { label: "未対応", cls: "border-rose-300 bg-rose-50 text-rose-700" },
};

interface LocalItem {
  itemId: string;
  label: string;
  hint: string;
  status: ChecklistItemStatus;
  evidence: string;
  suggestion: string;
}

export function GuidelineChecklistPanel() {
  const { mainText } = useApp();
  const [guidelineId, setGuidelineId] = useState(guidelines[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LocalItem[] | null>(null);

  const guideline = guidelines.find((g) => g.id === guidelineId) ?? guidelines[0];

  async function runCheck() {
    if (!mainText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guidelineId, text: mainText }),
      });
      const data = (await res.json()) as QualityChecklistResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Checklist request failed.");
      const byId = new Map(guideline.items.map((it) => [it.id, it]));
      setItems(
        data.items.map((r) => {
          const meta = byId.get(r.itemId);
          return {
            itemId: r.itemId,
            label: meta?.label ?? r.itemId,
            hint: meta?.hint ?? "",
            status: r.status,
            evidence: r.evidence,
            suggestion: r.suggestion,
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  function setItemStatus(itemId: string, status: ChecklistItemStatus) {
    setItems((prev) => prev?.map((it) => (it.itemId === itemId ? { ...it, status } : it)) ?? prev);
  }

  const summary = items
    ? { satisfied: items.filter((i) => i.status === "satisfied").length, total: items.length }
    : null;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">報告ガイドライン</label>
        <select
          value={guidelineId}
          onChange={(e) => {
            setGuidelineId(e.target.value);
            setItems(null);
          }}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        >
          {guidelines.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} — {g.fullName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">{guideline.description}</p>
      </div>

      <button
        onClick={runCheck}
        disabled={loading || !mainText.trim()}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "チェック中..." : "チェック実行"}
      </button>
      {!mainText.trim() && <p className="text-[11px] text-slate-400">本文校正タブなどで原稿本文を入力してから実行してください。</p>}
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {summary && (
        <p className="text-xs font-medium text-slate-600">
          対応済み {summary.satisfied} / {summary.total} 項目
        </p>
      )}

      {items && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.itemId} className="rounded-md border border-slate-200 p-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  {item.hint && <p className="text-slate-400">{item.hint}</p>}
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium ${STATUS_LABELS[item.status].cls}`}>
                  {STATUS_LABELS[item.status].label}
                </span>
              </div>
              {item.evidence && <p className="mt-1.5 text-slate-500">根拠: {item.evidence}</p>}
              {item.suggestion && <p className="mt-1 text-amber-700">{item.suggestion}</p>}
              <div className="mt-2 flex gap-1.5">
                {(["satisfied", "partial", "missing"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setItemStatus(item.itemId, s)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      item.status === s ? STATUS_LABELS[s].cls : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {STATUS_LABELS[s].label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
