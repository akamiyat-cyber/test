"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";
import { formatToJournalTemplate } from "@/lib/export/templateFormat";
import { downloadTextFile } from "@/lib/downloadFile";

export function TemplateFormatPanel() {
  const { mainText, setMainText, journalId } = useApp();
  const [copied, setCopied] = useState(false);
  const journal = getJournalProfile(journalId);

  const formatted = useMemo(() => formatToJournalTemplate(mainText, journal), [mainText, journal]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{journal.name}</span> の見出し構成: {journal.headingTemplate.join(" → ")}
      </p>
      <p className="text-[11px] text-slate-400">
        本文中の <code>## 見出し</code> を上記の構成に合わせて並べ替えます。一致する見出しが見つからない項目は仮の見出しとして追加され、テンプレートに合わない見出しは末尾に残されます。
      </p>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(formatted);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={() => downloadTextFile(formatted, "manuscript-template.md", "text/markdown;charset=utf-8")}
          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          Download
        </button>
        <button
          onClick={() => setMainText(formatted)}
          className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
        >
          本文に反映(上書き)
        </button>
      </div>

      <pre className="flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-700 whitespace-pre-wrap">
        {formatted}
      </pre>
    </div>
  );
}
