"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { statementFieldDefs, statementTypes } from "@/lib/statementFields";
import type { StatementType } from "@/types/api";

export function StatementGeneratorPanel() {
  const { journalId } = useApp();
  const [statementType, setStatementType] = useState<StatementType>("data-availability");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState("");

  const fields = statementFieldDefs[statementType];

  function setField(id: string, value: string) {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementType, formData, journalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Statement generation failed.");
      setStatement(data.statement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {statementTypes.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setStatementType(t.id);
              setFormData({});
              setStatement("");
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              statementType === t.id ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={formData[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
              />
            ) : (
              <input
                value={formData[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? "生成中..." : "生成する"}
      </button>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {statement && (
        <div className="rounded-md border border-slate-200 p-2.5">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{statement}</p>
          <button
            onClick={() => navigator.clipboard.writeText(statement)}
            className="mt-2 rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
