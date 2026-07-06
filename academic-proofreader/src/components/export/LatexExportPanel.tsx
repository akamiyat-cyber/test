"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";
import { convertToLatex } from "@/lib/export/latex";
import { downloadTextFile } from "@/lib/downloadFile";

export function LatexExportPanel() {
  const { mainText, journalId } = useApp();
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const journal = getJournalProfile(journalId);

  const latex = useMemo(() => convertToLatex(mainText, journal, title), [mainText, journal, title]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">論文タイトル(任意)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(latex);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={() => downloadTextFile(latex, "manuscript.tex", "text/x-tex;charset=utf-8")}
          className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Download .tex
        </button>
      </div>

      <pre className="flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">
        {latex}
      </pre>
    </div>
  );
}
