import type { JournalProfile } from "@/lib/journalProfiles";

export function JournalProfileInfo({ journal }: { journal: JournalProfile }) {
  return (
    <div className="space-y-3 text-xs text-slate-600">
      <div>
        <p className="font-semibold text-slate-700">文体の指針</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>能動態: {journal.styleGuidelines.activeVoice}</li>
          <li>
            一人称: {journal.styleGuidelines.firstPersonAllowed ? "使用可" : "非推奨"} — {journal.styleGuidelines.firstPersonNote}
          </li>
          <li>文の長さ: {journal.styleGuidelines.sentenceLength}</li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-slate-700">見出し構成（参考）</p>
        <p className="mt-1 text-slate-500">{journal.headingTemplate.join(" → ")}</p>
      </div>
      <div>
        <p className="font-semibold text-slate-700">参考文献スタイル</p>
        <p className="mt-1 text-slate-500">{journal.referenceStyle.summary}</p>
        <p className="text-slate-500">{journal.referenceStyle.etAlRule}</p>
      </div>
      <div>
        <p className="font-semibold text-slate-700">制限語数</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>要旨: {journal.wordLimits.abstract ?? "制限なし"}</li>
          <li>本文: {journal.wordLimits.mainText ?? "制限なし"}</li>
          <li>図表キャプション: {journal.wordLimits.figureCaption ?? "制限なし"}</li>
        </ul>
      </div>
    </div>
  );
}
