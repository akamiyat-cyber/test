// Lightweight word-level diff used only for the version-history comparison
// view (comparing two arbitrary snapshots of text). This is a classic LCS
// based diff over whitespace-separated tokens — fine for manuscript-sized
// text, not intended for huge documents.

export type WordDiffOp =
  | { type: "equal"; text: string }
  | { type: "delete"; text: string }
  | { type: "insert"; text: string };

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

export function diffWords(oldText: string, newText: string): WordDiffOp[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;

  // DP LCS table; guard against pathological sizes.
  if (n * m > 4_000_000) {
    return [
      { type: "delete", text: oldText },
      { type: "insert", text: newText },
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: WordDiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "delete", text: a[i] });
      i++;
    } else {
      ops.push({ type: "insert", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "delete", text: a[i] });
    i++;
  }
  while (j < m) {
    ops.push({ type: "insert", text: b[j] });
    j++;
  }

  // Merge consecutive ops of the same type for cleaner rendering.
  const merged: WordDiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}
