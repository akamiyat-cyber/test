"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { convertToMarkdown } from "@/lib/export/markdown";
import { downloadTextFile } from "@/lib/downloadFile";

export function MarkdownExportPanel() {
  const { mainText } = useApp();
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => convertToMarkdown(mainText, title), [mainText, title]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">論文タイトル(任意、# 見出しとして追加)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={() => downloadTextFile(markdown, "manuscript.md", "text/markdown;charset=utf-8")}
          className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Download .md
        </button>
      </div>

      <pre className="flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-700 whitespace-pre-wrap">
        {markdown}
      </pre>
    </div>
  );
}
