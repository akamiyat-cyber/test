"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { phrasebankCategories } from "@/lib/phrasebank";

export function PhrasebankPanel() {
  const { insertIntoMainText } = useApp();
  const [categoryId, setCategoryId] = useState(phrasebankCategories[0].id);
  const category = phrasebankCategories.find((c) => c.id === categoryId) ?? phrasebankCategories[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {phrasebankCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              categoryId === c.id ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c.nameJa}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5">
        {category.phrases.map((phrase, i) => (
          <li key={i}>
            <button
              onClick={() => insertIntoMainText(phrase + " ")}
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              title="クリックして本文のカーソル位置へ挿入"
            >
              {phrase}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
