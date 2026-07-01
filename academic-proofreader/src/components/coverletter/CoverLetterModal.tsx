"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

export function CoverLetterModal({ onClose }: { onClose: () => void }) {
  const { generateCoverLetter, loadingCoverLetter, errorCoverLetter, coverLetter } = useApp();
  const [title, setTitle] = useState("");
  const [authorNotes, setAuthorNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">カバーレター生成</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">論文タイトル（任意）</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">補足情報（任意）</label>
            <textarea
              value={authorNotes}
              onChange={(e) => setAuthorNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
              placeholder="強調したい新規性や背景など"
            />
          </div>

          <button
            onClick={() => generateCoverLetter(title, authorNotes)}
            disabled={loadingCoverLetter}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {loadingCoverLetter ? "生成中..." : "生成する"}
          </button>

          {errorCoverLetter && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorCoverLetter}
            </div>
          )}

          {coverLetter && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">下書き</label>
                <button
                  onClick={() => navigator.clipboard.writeText(coverLetter)}
                  className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Copy
                </button>
              </div>
              <textarea
                readOnly
                value={coverLetter}
                rows={12}
                className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700 outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
