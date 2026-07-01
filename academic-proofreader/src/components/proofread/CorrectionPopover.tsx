"use client";

import { useEffect, useRef } from "react";
import { categoryBadgeClasses, categoryLabels } from "@/lib/categoryStyles";
import type { Correction, ReasonLanguage } from "@/lib/types";

export function CorrectionPopover({
  correction,
  reasonLanguage,
  onAccept,
  onReject,
  onClose,
  onComment,
}: {
  correction: Correction;
  reasonLanguage: ReasonLanguage;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  onComment?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const reason = reasonLanguage === "ja" ? correction.reasonJa : correction.reason;

  return (
    <div
      ref={ref}
      className="absolute z-30 top-full left-0 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
    >
      <span
        className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${categoryBadgeClasses[correction.category]}`}
      >
        {categoryLabels[correction.category][reasonLanguage]}
      </span>
      <p className="mt-2 text-slate-600 line-through">{correction.original}</p>
      <p className="mt-1 font-medium text-slate-900">{correction.revised}</p>
      <p className="mt-2 text-slate-500">{reason}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onAccept}
          className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700"
        >
          Reject
        </button>
        {onComment && (
          <button
            onClick={onComment}
            className="ml-auto rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            Comment
          </button>
        )}
      </div>
    </div>
  );
}
