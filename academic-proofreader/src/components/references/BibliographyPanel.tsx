"use client";

import { useApp } from "@/context/AppContext";
import { getJournalProfile } from "@/lib/journalProfiles";

const STYLE_LABELS: Record<string, string> = {
  vancouver: "Vancouver (numbered)",
  apa: "APA (author-date)",
  nature: "Nature (numbered, superscript)",
};

export function BibliographyPanel() {
  const { bibliography, journalId, insertIntoMainText } = useApp();
  const journal = getJournalProfile(journalId);
  const styleId = journal.referenceStyle.citationStyleId;
  const fullText = bibliography.map((b) => b.entry).join("\n");

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        書式: <span className="font-medium text-slate-700">{STYLE_LABELS[styleId] ?? styleId}</span>（{journal.name}）
      </p>

      {bibliography.length === 0 ? (
        <p className="text-sm text-slate-400">ライブラリに参考文献を追加すると、ここに整形済みリストが表示されます。</p>
      ) : (
        <>
          <ol className="space-y-1.5 text-xs leading-6 text-slate-800">
            {bibliography.map((b) => (
              <li key={b.reference.id}>{b.entry}</li>
            ))}
          </ol>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(fullText)}
              className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Copy
            </button>
            <button
              onClick={() => insertIntoMainText(`\n\nReferences\n${fullText}`)}
              className="rounded border border-indigo-300 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
            >
              本文に挿入
            </button>
          </div>
        </>
      )}
    </div>
  );
}
