"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

export function CommentsPanel() {
  const { comments, addComment, removeComment } = useApp();
  const [text, setText] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="原稿全体へのコメントを追加..."
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              addComment({ targetType: "global", text });
              setText("");
            }
          }}
        />
        <button
          onClick={() => {
            if (text.trim()) {
              addComment({ targetType: "global", text });
              setText("");
            }
          }}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
        >
          追加
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-400">共著者コメントはまだありません。</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-slate-200 p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {c.targetLabel && (
                    <p className="mb-1 text-slate-400 line-through">{c.targetLabel}</p>
                  )}
                  <p className="text-slate-700">{c.text}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(c.createdAt).toLocaleString()} · {c.targetType === "correction" ? "修正箇所" : "全体"}
                  </p>
                </div>
                <button
                  onClick={() => removeComment(c.id)}
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                  aria-label="delete comment"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
