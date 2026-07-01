"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { whitelistPresets } from "@/lib/whitelistPresets";

export function WhitelistPanel() {
  const { whitelist, addWhitelistTerm, removeWhitelistTerm, applyWhitelistPreset } = useApp();
  const [term, setTerm] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-700">分野別プリセット</p>
        <div className="flex flex-wrap gap-1.5">
          {whitelistPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyWhitelistPreset(preset.id)}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="例: GWAS"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && term.trim()) {
              addWhitelistTerm(term);
              setTerm("");
            }
          }}
        />
        <button
          onClick={() => {
            if (term.trim()) {
              addWhitelistTerm(term);
              setTerm("");
            }
          }}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
        >
          追加
        </button>
      </div>

      {whitelist.length === 0 ? (
        <p className="text-xs text-slate-400">登録された用語はありません。</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {whitelist.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
            >
              {t.term}
              <button onClick={() => removeWhitelistTerm(t.id)} className="text-indigo-400 hover:text-indigo-700" aria-label={`remove ${t.term}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
