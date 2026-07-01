"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { TabId } from "@/context/AppContext";
import { CoverLetterModal } from "@/components/coverletter/CoverLetterModal";
import { ProofreadPane } from "@/components/proofread/ProofreadPane";
import { ReviewerResponseTab } from "@/components/reviewer/ReviewerResponseTab";

const TABS: { id: TabId; label: string }[] = [
  { id: "body", label: "本文校正" },
  { id: "caption", label: "図表キャプション" },
  { id: "reviewer", label: "査読対応" },
];

export function MainContent() {
  const {
    activeTab,
    setActiveTab,
    mainText,
    setMainText,
    mainResult,
    loadingMain,
    errorMain,
    captionText,
    setCaptionText,
    captionResult,
    loadingCaption,
    errorCaption,
  } = useApp();
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                activeTab === tab.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCoverLetter(true)}
          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          カバーレター生成
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "body" && (
          <ProofreadPane
            mode="body"
            text={mainText}
            setText={setMainText}
            result={mainResult}
            loading={loadingMain}
            error={errorMain}
            placeholder="原稿本文をここに貼り付け、または入力してください..."
            showHistoryAndComments
          />
        )}
        {activeTab === "caption" && (
          <ProofreadPane
            mode="caption"
            text={captionText}
            setText={setCaptionText}
            result={captionResult}
            loading={loadingCaption}
            error={errorCaption}
            placeholder="Figure/Table のキャプションをここに貼り付けてください..."
          />
        )}
        {activeTab === "reviewer" && <ReviewerResponseTab />}
      </div>

      {showCoverLetter && <CoverLetterModal onClose={() => setShowCoverLetter(false)} />}
    </div>
  );
}
