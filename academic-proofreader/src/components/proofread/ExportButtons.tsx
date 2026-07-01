"use client";

import { useState } from "react";
import { downloadTextAsDocx } from "@/lib/docx";

export function ExportButtons({ text, filename }: { text: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        disabled={!text.trim()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        {copied ? "Copied!" : "Copy text"}
      </button>
      <button
        onClick={() => downloadTextAsDocx(text, filename)}
        disabled={!text.trim()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        Download .docx
      </button>
    </div>
  );
}
