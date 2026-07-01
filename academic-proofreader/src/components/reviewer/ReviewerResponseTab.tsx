"use client";

import { useApp } from "@/context/AppContext";
import { ExportButtons } from "@/components/proofread/ExportButtons";

export function ReviewerResponseTab() {
  const {
    reviewerCommentsText,
    setReviewerCommentsText,
    generateReviewerResponse,
    loadingReviewerResponse,
    errorReviewerResponse,
    reviewerResponse,
  } = useApp();

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">レビューアーコメント</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <textarea
            value={reviewerCommentsText}
            onChange={(e) => setReviewerCommentsText(e.target.value)}
            placeholder="レビューアーからのコメントをここに貼り付けてください..."
            spellCheck={false}
            className="h-full w-full resize-none border-0 bg-transparent p-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={generateReviewerResponse}
            disabled={loadingReviewerResponse || !reviewerCommentsText.trim()}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {loadingReviewerResponse ? "生成中..." : "Response to Reviewers を生成"}
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">回答の下書き</span>
        </div>

        {errorReviewerResponse && (
          <div className="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorReviewerResponse}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loadingReviewerResponse && <p className="text-sm text-slate-400">Claude が回答を作成しています...</p>}
          {!loadingReviewerResponse && !reviewerResponse && (
            <p className="text-sm text-slate-400">コメントを貼り付けて生成ボタンを押してください。</p>
          )}
          {reviewerResponse && (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{reviewerResponse}</p>
          )}
        </div>

        {reviewerResponse && (
          <div className="border-t border-slate-200 p-3">
            <ExportButtons text={reviewerResponse} filename="response-to-reviewers.docx" />
          </div>
        )}
      </div>
    </div>
  );
}
