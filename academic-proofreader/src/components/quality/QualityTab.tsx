"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";
import { Editor } from "@/components/proofread/Editor";
import { WordCountBadge } from "@/components/proofread/WordCountBadge";
import { CompanionDocsPanel } from "./CompanionDocsPanel";
import { GuidelineChecklistPanel } from "./GuidelineChecklistPanel";
import { StatementGeneratorPanel } from "./StatementGeneratorPanel";
import { StatsCheckPanel } from "./StatsCheckPanel";
import { TitleAbstractPanel } from "./TitleAbstractPanel";

type QualitySubTab = "checklist" | "stats" | "statements" | "title-abstract" | "companion-docs";

const SUB_TABS: { id: QualitySubTab; label: string }[] = [
  { id: "checklist", label: "チェックリスト" },
  { id: "stats", label: "統計チェック" },
  { id: "statements", label: "ステートメント" },
  { id: "title-abstract", label: "タイトル・要旨" },
  { id: "companion-docs", label: "付随文書" },
];

export function QualityTab() {
  const { mainText, setMainText, mainTextareaRef, journalId } = useApp();
  const [subTab, setSubTab] = useState<QualitySubTab>("checklist");
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
            placeholder="チェックリスト・統計チェック・付随文書生成はこの本文を対象に実行されます..."
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
          {subTab === "checklist" && <GuidelineChecklistPanel />}
          {subTab === "stats" && <StatsCheckPanel />}
          {subTab === "statements" && <StatementGeneratorPanel />}
          {subTab === "title-abstract" && <TitleAbstractPanel />}
          {subTab === "companion-docs" && <CompanionDocsPanel />}
        </div>
      </div>
    </div>
  );
}
