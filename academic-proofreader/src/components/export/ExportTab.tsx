"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";
import { Editor } from "@/components/proofread/Editor";
import { WordCountBadge } from "@/components/proofread/WordCountBadge";
import { FigureTableEquationPanel } from "./FigureTableEquationPanel";
import { LatexExportPanel } from "./LatexExportPanel";
import { MarkdownExportPanel } from "./MarkdownExportPanel";
import { TemplateFormatPanel } from "./TemplateFormatPanel";

type ExportSubTab = "numbering" | "latex" | "markdown" | "template";

const SUB_TABS: { id: ExportSubTab; label: string }[] = [
  { id: "numbering", label: "図表・数式" },
  { id: "latex", label: "LaTeX" },
  { id: "markdown", label: "Markdown" },
  { id: "template", label: "テンプレート整形" },
];

export function ExportTab() {
  const { mainText, setMainText, mainTextareaRef, journalId } = useApp();
  const [subTab, setSubTab] = useState<ExportSubTab>("numbering");
  const journal = getJournalProfile(journalId);

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">原稿本文</span>
          <WordCountBadge text={mainText} limit={journal.wordLimits.mainText} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Editor
            value={mainText}
            onChange={setMainText}
            placeholder="ここに原稿を書いていきます。[[fig:label]] キャプション のように書くと図表・数式を自動採番できます..."
            textareaRef={mainTextareaRef}
          />
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-2">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`whitespace-nowrap rounded-t-md px-3 py-1.5 text-xs font-medium ${
                subTab === t.id ? "border border-b-0 border-slate-200 bg-white text-indigo-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {subTab === "numbering" && <FigureTableEquationPanel />}
          {subTab === "latex" && <LatexExportPanel />}
          {subTab === "markdown" && <MarkdownExportPanel />}
          {subTab === "template" && <TemplateFormatPanel />}
        </div>
      </div>
    </div>
  );
}
