"use client";

import { useApp } from "@/context/AppContext";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { getJournalProfile, journalProfiles } from "@/lib/journalProfiles";
import { stylePresets } from "@/lib/stylePresets";
import { JournalProfileInfo } from "./JournalProfileInfo";
import { WhitelistPanel } from "./WhitelistPanel";

export function Sidebar() {
  const {
    journalId,
    setJournalId,
    stylePresetId,
    setStylePresetId,
    reasonLanguage,
    setReasonLanguage,
    cloudSyncState,
    cloudSyncError,
  } = useApp();
  const journal = getJournalProfile(journalId);

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
      <div>
        <h1 className="text-base font-bold text-slate-800">Academic English Proofreader</h1>
        <p className="mt-0.5 text-xs text-slate-500">学術英語校正アシスタント</p>
      </div>

      <AuthPanel />
      {cloudSyncState === "syncing" && (
        <p className="text-[11px] text-slate-500">クラウドと同期中...</p>
      )}
      {cloudSyncState === "error" && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
          同期エラー: {cloudSyncError}
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">ジャーナル</label>
        <select
          value={journalId}
          onChange={(e) => setJournalId(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
        >
          {journalProfiles.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">文体プリセット</label>
        <select
          value={stylePresetId}
          onChange={(e) => setStylePresetId(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
        >
          {stylePresets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">
          {stylePresets.find((s) => s.id === stylePresetId)?.description}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">修正理由の表示言語</label>
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
          {(["en", "ja"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setReasonLanguage(lang)}
              className={`flex-1 rounded px-2 py-1 font-medium ${
                reasonLanguage === lang ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {lang === "en" ? "English" : "日本語"}
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-md border border-slate-200 bg-white p-2.5" open>
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">ジャーナル・フォーマット情報</summary>
        <div className="mt-2">
          <JournalProfileInfo journal={journal} />
        </div>
      </details>

      <details className="rounded-md border border-slate-200 bg-white p-2.5" open>
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">専門用語ホワイトリスト</summary>
        <div className="mt-2">
          <WhitelistPanel />
        </div>
      </details>
    </aside>
  );
}
