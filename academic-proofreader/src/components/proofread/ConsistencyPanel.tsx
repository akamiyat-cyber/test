import type { ConsistencyIssue } from "@/lib/types";

export function ConsistencyPanel({ issues }: { issues: ConsistencyIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-slate-400">用語の表記ゆれ・未定義の略語は見つかりませんでした。</p>;
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li key={issue.id} className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs">
          <p className="font-medium text-amber-900">{issue.term}</p>
          <p className="mt-1 text-amber-800">
            表記ゆれ: {issue.variants.join(" / ")}
          </p>
          <p className="mt-1 text-amber-700">{issue.suggestion}</p>
        </li>
      ))}
    </ul>
  );
}
