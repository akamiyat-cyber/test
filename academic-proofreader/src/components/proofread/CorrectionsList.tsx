"use client";

import { categoryBadgeClasses, categoryLabels } from "@/lib/categoryStyles";
import { useApp } from "@/context/AppContext";
import type { Correction, ProofreadMode } from "@/lib/types";

function statusLabel(status: Correction["status"]) {
  if (status === "accepted") return { text: "Accepted", cls: "text-emerald-600" };
  if (status === "rejected") return { text: "Rejected", cls: "text-rose-600" };
  return { text: "Pending", cls: "text-slate-400" };
}

export function CorrectionsList({ corrections, mode }: { corrections: Correction[]; mode: ProofreadMode }) {
  const { reasonLanguage, setCorrectionStatus } = useApp();

  if (corrections.length === 0) {
    return <p className="text-sm text-slate-400">修正候補はありません。</p>;
  }

  return (
    <ul className="space-y-2">
      {corrections.map((c) => {
        const status = statusLabel(c.status);
        return (
          <li key={c.id} className="rounded-md border border-slate-200 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${categoryBadgeClasses[c.category]}`}>
                {categoryLabels[c.category][reasonLanguage]}
              </span>
              <span className={`text-[11px] font-medium ${status.cls}`}>{status.text}</span>
            </div>
            <p className="mt-1.5 text-slate-500 line-through">{c.original}</p>
            <p className="mt-0.5 font-medium text-slate-900">{c.revised}</p>
            <p className="mt-1 text-slate-500">{reasonLanguage === "ja" ? c.reasonJa : c.reason}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setCorrectionStatus(mode, c.id, "accepted")}
                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                disabled={c.status === "accepted"}
              >
                Accept
              </button>
              <button
                onClick={() => setCorrectionStatus(mode, c.id, "rejected")}
                className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700 disabled:opacity-40"
                disabled={c.status === "rejected"}
              >
                Reject
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
