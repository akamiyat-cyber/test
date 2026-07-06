"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";
import { Editor } from "@/components/proofread/Editor";
import { WordCountBadge } from "@/components/proofread/WordCountBadge";
import { BibliographyPanel } from "./BibliographyPanel";
import { CitationCheckPanel } from "./CitationCheckPanel";
import { ImportPanel } from "./ImportPanel";
import { LibraryList } from "./LibraryList";
import { SearchPanel } from "./SearchPanel";

type ReferencesSubTab = "library" | "import" | "search" | "check" | "bibliography";

const SUB_TABS: { id: ReferencesSubTab; label: string }[] = [
  { id: "library", label: "ライブラリ" },
  { id: "import", label: "インポート" },
  { id: "search", label: "検索" },
  { id: "check", label: "引用チェック" },
  { id: "bibliography", label: "整形" },
];

export function ReferencesTab() {
  const { mainText, setMainText, mainTextareaRef, journalId, references } = useApp();
  const [subTab, setSubTab] = useState<ReferencesSubTab>("library");
  const journal = getJournalProfile(journalId);

  const labelWithCount = (tab: ReferencesSubTab) => {
    if (tab === "library") return `ライブラリ (${references.length})`;
    return SUB_TABS.find((t) => t.id === tab)?.label ?? "";
  };

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
            placeholder="ここに原稿を書いていきます。検索結果やライブラリから引用を挿入できます..."
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
              {labelWithCount(t.id)}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {subTab === "library" && <LibraryList />}
          {subTab === "import" && <ImportPanel />}
          {subTab === "search" && <SearchPanel />}
          {subTab === "check" && <CitationCheckPanel />}
          {subTab === "bibliography" && <BibliographyPanel />}
        </div>
      </div>
    </div>
  );
}
