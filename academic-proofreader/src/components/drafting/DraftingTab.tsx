"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";
import { Editor } from "@/components/proofread/Editor";
import { WordCountBadge } from "@/components/proofread/WordCountBadge";
import { OutlineGenerator } from "./OutlineGenerator";
import { SectionDraftGenerator } from "./SectionDraftGenerator";
import { PhrasebankPanel } from "./PhrasebankPanel";
import { ParaphraseCompressPanel } from "./ParaphraseCompressPanel";

type DraftingSubTab = "outline" | "section" | "phrasebank" | "paraphrase";

const SUB_TABS: { id: DraftingSubTab; label: string }[] = [
  { id: "outline", label: "アウトライン" },
  { id: "section", label: "セクション下書き" },
  { id: "phrasebank", label: "フレーズバンク" },
  { id: "paraphrase", label: "言い換え・圧縮" },
];

export function DraftingTab() {
  const { mainText, setMainText, mainTextareaRef, journalId } = useApp();
  const [subTab, setSubTab] = useState<DraftingSubTab>("outline");
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
            placeholder="ここに原稿を書いていきます。右側のツールで生成した文章やフレーズはカーソル位置に挿入されます..."
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
          {subTab === "outline" && <OutlineGenerator />}
          {subTab === "section" && <SectionDraftGenerator />}
          {subTab === "phrasebank" && <PhrasebankPanel />}
          {subTab === "paraphrase" && <ParaphraseCompressPanel />}
        </div>
      </div>
    </div>
  );
}
