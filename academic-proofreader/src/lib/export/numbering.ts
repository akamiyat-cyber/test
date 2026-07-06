// Figure/table/equation auto-numbering and cross-reference resolution.
//
// Since the editor is a plain textarea (no rich-text figure/table objects),
// the user marks these with a lightweight inline tag syntax typed directly
// into the manuscript:
//   [[fig:label]] Caption text on the same line
//   [[table:label]] Caption text on the same line
//   [[eq:label]]                 (place right after/near the equation itself)
//   [[ref:label]]                (cross-reference, anywhere in the text)
// Numbers are assigned per category, in the order the declarations appear in
// the text — independent of where any [[ref:label]] pointing to them sits.

export type NumberingCategory = "figure" | "table" | "equation";

export interface NumberedItem {
  label: string;
  number: number;
  caption: string;
}

export interface ResolvedRef {
  label: string;
  category: NumberingCategory | null;
  number: number | null;
}

export interface BrokenRef {
  label: string;
  context: string;
}

export interface NumberingResult {
  figures: NumberedItem[];
  tables: NumberedItem[];
  equations: NumberedItem[];
  refs: ResolvedRef[];
  brokenRefs: BrokenRef[];
}

export const categoryLabel: Record<NumberingCategory, string> = {
  figure: "Figure",
  table: "Table",
  equation: "Equation",
};

const FIGURE_RE = /\[\[fig:([\w-]+)\]\]([^\n]*)/g;
const TABLE_RE = /\[\[table:([\w-]+)\]\]([^\n]*)/g;
const EQUATION_RE = /\[\[eq:([\w-]+)\]\]/g;
const REF_RE = /\[\[ref:([\w-]+)\]\]/g;

function extractItems(text: string, re: RegExp): NumberedItem[] {
  const items: NumberedItem[] = [];
  let match: RegExpExecArray | null;
  let n = 0;
  re.lastIndex = 0;
  while ((match = re.exec(text))) {
    n++;
    items.push({ label: match[1], number: n, caption: (match[2] ?? "").trim() });
  }
  return items;
}

export function buildLabelIndex(
  parsed: Pick<NumberingResult, "figures" | "tables" | "equations">
): Map<string, { category: NumberingCategory; number: number }> {
  const index = new Map<string, { category: NumberingCategory; number: number }>();
  parsed.figures.forEach((f) => index.set(f.label, { category: "figure", number: f.number }));
  parsed.tables.forEach((t) => index.set(t.label, { category: "table", number: t.number }));
  parsed.equations.forEach((e) => index.set(e.label, { category: "equation", number: e.number }));
  return index;
}

export function parseNumbering(text: string): NumberingResult {
  const figures = extractItems(text, FIGURE_RE);
  const tables = extractItems(text, TABLE_RE);
  const equations = extractItems(text, EQUATION_RE);
  const labelIndex = buildLabelIndex({ figures, tables, equations });

  const refs: ResolvedRef[] = [];
  const brokenRefs: BrokenRef[] = [];
  let match: RegExpExecArray | null;
  REF_RE.lastIndex = 0;
  while ((match = REF_RE.exec(text))) {
    const label = match[1];
    const found = labelIndex.get(label);
    refs.push({ label, category: found?.category ?? null, number: found?.number ?? null });
    if (!found) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 20);
      brokenRefs.push({ label, context: text.slice(start, end).trim() });
    }
  }

  return { figures, tables, equations, refs, brokenRefs };
}

/**
 * Replaces all tags with resolved plain text: declarations become
 * "**Figure N.** caption" / "**Table N.** caption" / "(N)", and refs become
 * "Figure N" / "Table N" / "Equation N" (or a visible "[[unresolved: label]]"
 * marker if the label doesn't match any declaration). Used for Markdown
 * export and the live preview panel.
 */
export function resolveNumberingToPlainText(text: string): string {
  const parsed = parseNumbering(text);
  const labelIndex = buildLabelIndex(parsed);

  let out = text;
  out = out.replace(FIGURE_RE, (_m, label: string, caption: string) => {
    const n = labelIndex.get(label)?.number;
    const cap = caption.trim();
    return `**Figure ${n}.**${cap ? ` ${cap}` : ""}`;
  });
  out = out.replace(TABLE_RE, (_m, label: string, caption: string) => {
    const n = labelIndex.get(label)?.number;
    const cap = caption.trim();
    return `**Table ${n}.**${cap ? ` ${cap}` : ""}`;
  });
  out = out.replace(EQUATION_RE, (_m, label: string) => {
    const n = labelIndex.get(label)?.number;
    return `(${n})`;
  });
  out = out.replace(REF_RE, (_m, label: string) => {
    const found = labelIndex.get(label);
    if (!found) return `[[unresolved: ${label}]]`;
    return `${categoryLabel[found.category]} ${found.number}`;
  });
  return out;
}
