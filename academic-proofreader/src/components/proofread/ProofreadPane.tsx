"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { computeFinalText } from "@/lib/diffSegments";
import { getJournalProfile } from "@/lib/journalProfiles";
import type { ProofreadMode, ProofreadResult } from "@/lib/types";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { VersionHistoryPanel } from "@/components/history/VersionHistoryPanel";
import { ConsistencyPanel } from "./ConsistencyPanel";
import { CorrectionsList } from "./CorrectionsList";
import { DiffView } from "./DiffView";
import { Editor } from "./Editor";
import { ExportButtons } from "./ExportButtons";
import { WordCountBadge } from "./WordCountBadge";

type SubTab = "diff" | "list" | "consistency" | "history" | "comments";

export function ProofreadPane({
  mode,
  text,
  setText,
  result,
  loading,
  error,
  placeholder,
  showHistoryAndComments = false,
}: {
  mode: ProofreadMode;
  text: string;
  setText: (t: string) => void;
  result: ProofreadResult | null;
  loading: boolean;
  error: string | null;
  placeholder: string;
  showHistoryAndComments?: boolean;
}) {
  const { journalId, runProofread, acceptAll, rejectAll, mainTextareaRef } = useApp();
  const [subTab, setSubTab] = useState<SubTab>("diff");
  const journal = getJournalProfile(journalId);
  const limit = mode === "caption" ? journal.wordLimits.figureCaption : journal.wordLimits.mainText;

  const finalText = result ? computeFinalText(text, result.corrections) : text;

  const tabs: { id: SubTab; label: string }[] = [
    { id: "diff", label: "差分表示" },
    { id: "list", label: `修正リスト${result ? ` (${result.corrections.length})` : ""}` },
    { id: "consistency", label: `一貫性チェック${result ? ` (${result.consistencyIssues.length})` : ""}` },
    ...(showHistoryAndComments
      ? ([
          { id: "history", label: "バージョン履歴" },
          { id: "comments", label: "コメント" },
        ] as const)
      : []),
  ];

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">原文</span>
          <WordCountBadge text={text} limit={limit} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Editor
            value={text}
            onChange={setText}
            placeholder={placeholder}
            textareaRef={mode === "body" ? mainTextareaRef : undefined}
          />
        </div>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={() => runProofread(mode)}
            disabled={loading || !text.trim()}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {loading ? "校正中..." : "校正"}
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">校正結果</span>
          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => acceptAll(mode)}
                className="rounded border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Accept All
              </button>
              <button
                onClick={() => rejectAll(mode)}
                className="rounded border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
              >
                Reject All
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`whitespace-nowrap rounded-t-md px-3 py-1.5 text-xs font-medium ${
                subTab === t.id
                  ? "border border-b-0 border-slate-200 bg-white text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!result && !loading && <p className="text-sm text-slate-400">「校正」を実行すると結果が表示されます。</p>}
          {loading && <p className="text-sm text-slate-400">Claude が原稿を分析しています...</p>}
          {result && subTab === "diff" && <DiffView sourceText={text} corrections={result.corrections} mode={mode} />}
          {result && subTab === "list" && <CorrectionsList corrections={result.corrections} mode={mode} />}
          {result && subTab === "consistency" && <ConsistencyPanel issues={result.consistencyIssues} />}
          {result && subTab === "history" && <VersionHistoryPanel mode={mode} currentText={finalText} />}
          {result && subTab === "comments" && <CommentsPanel />}
        </div>

        {result && (
          <div className="border-t border-slate-200 p-3">
            <ExportButtons text={finalText} filename={mode === "body" ? "revised-manuscript.docx" : "revised-captions.docx"} />
          </div>
        )}
      </div>
    </div>
  );
}
