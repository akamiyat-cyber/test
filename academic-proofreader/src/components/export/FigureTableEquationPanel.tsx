"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { parseNumbering } from "@/lib/export/numbering";

export function FigureTableEquationPanel() {
  const { mainText } = useApp();
  const parsed = useMemo(() => parseNumbering(mainText), [mainText]);

  return (
    <div className="space-y-3">
      <details className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs">
        <summary className="cursor-pointer font-semibold text-slate-700">タグの書き方</summary>
        <div className="mt-2 space-y-1 text-slate-600">
          <p>
            <code className="rounded bg-white px-1">[[fig:label]] キャプション</code> — 図(採番はこの本文中の出現順)
          </p>
          <p>
            <code className="rounded bg-white px-1">[[table:label]] キャプション</code> — 表
          </p>
          <p>
            <code className="rounded bg-white px-1">[[eq:label]]</code> — 数式(数式本体の直後に置く)
          </p>
          <p>
            <code className="rounded bg-white px-1">[[ref:label]]</code> — 本文中の相互参照(「Figure 1」等に自動変換)
          </p>
        </div>
      </details>

      <Section title={`図 (${parsed.figures.length})`}>
        {parsed.figures.length === 0 ? (
          <Empty>まだ図はありません。</Empty>
        ) : (
          <ItemList items={parsed.figures.map((f) => ({ key: f.label, primary: `Figure ${f.number}: ${f.label}`, secondary: f.caption }))} />
        )}
      </Section>

      <Section title={`表 (${parsed.tables.length})`}>
        {parsed.tables.length === 0 ? (
          <Empty>まだ表はありません。</Empty>
        ) : (
          <ItemList items={parsed.tables.map((t) => ({ key: t.label, primary: `Table ${t.number}: ${t.label}`, secondary: t.caption }))} />
        )}
      </Section>

      <Section title={`数式 (${parsed.equations.length})`}>
        {parsed.equations.length === 0 ? (
          <Empty>まだ数式はありません。</Empty>
        ) : (
          <ItemList items={parsed.equations.map((e) => ({ key: e.label, primary: `Equation ${e.number}: ${e.label}` }))} />
        )}
      </Section>

      <Section title={`未解決の相互参照 (${parsed.brokenRefs.length})`}>
        {parsed.brokenRefs.length === 0 ? (
          <Empty>すべての [[ref:...]] が図/表/数式に対応しています。</Empty>
        ) : (
          <ul className="space-y-1.5">
            {parsed.brokenRefs.map((b, i) => (
              <li key={i} className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
                <span className="font-medium">[[ref:{b.label}]]</span> — 対応する図/表/数式が見つかりません
                <p className="mt-0.5 text-rose-600">…{b.context}…</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-700">{title}</p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400">{children}</p>;
}

function ItemList({ items }: { items: { key: string; primary: string; secondary?: string }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.key} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs">
          <p className="font-medium text-slate-800">{it.primary}</p>
          {it.secondary && <p className="text-slate-500">{it.secondary}</p>}
        </li>
      ))}
    </ul>
  );
}
