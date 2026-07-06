// Markdown export: the manuscript's ## / ### / - markup is already Markdown,
// so this just resolves the [[fig:]]/[[table:]]/[[eq:]]/[[ref:]] numbering
// tags to plain text (unlike LaTeX, Markdown has no native \label/\ref, so
// numbers are baked in here rather than left to a renderer).

import { resolveNumberingToPlainText } from "./numbering";

export function convertToMarkdown(text: string, title: string): string {
  const body = resolveNumberingToPlainText(text);
  const heading = title.trim() ? `# ${title.trim()}\n\n` : "";
  return `${heading}${body}\n`;
}
