// Converts the manuscript's lightweight markup (## / ### headings, - bullet
// lists, and the [[fig:]]/[[table:]]/[[eq:]]/[[ref:]] tags from numbering.ts)
// into an Overleaf-pasteable .tex file. Figure/table/equation numbering is
// left to LaTeX itself (\label / \ref) rather than pre-resolved to hard
// numbers — that's the whole point of LaTeX cross-referencing, and it's more
// robust to later reordering than baking in numbers the way the Markdown
// export has to.

import type { JournalProfile } from "@/lib/journalProfiles";
import { buildLabelIndex, parseNumbering, type NumberingCategory } from "./numbering";

const LATEX_PREFIX: Record<NumberingCategory, string> = { figure: "fig", table: "tab", equation: "eq" };

function escapeLatex(text: string): string {
  return text.replace(/[\\&%$#_{}~^]/g, (c) => {
    switch (c) {
      case "\\":
        return "\\textbackslash{}";
      case "~":
        return "\\textasciitilde{}";
      case "^":
        return "\\textasciicircum{}";
      default:
        return `\\${c}`;
    }
  });
}

/** Wraps consecutive `\item ...` lines produced from `- ...` bullets in `itemize` blocks. */
function wrapItemizeRuns(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inItems = false;
  for (const line of lines) {
    const isItem = /^\\item /.test(line);
    if (isItem && !inItems) {
      out.push("\\begin{itemize}");
      inItems = true;
    } else if (!isItem && inItems) {
      out.push("\\end{itemize}");
      inItems = false;
    }
    out.push(line);
  }
  if (inItems) out.push("\\end{itemize}");
  return out.join("\n");
}

export function convertToLatex(text: string, journal: JournalProfile, title: string): string {
  const parsed = parseNumbering(text);
  const labelIndex = buildLabelIndex(parsed);

  let body = text;

  body = body.replace(/\[\[fig:([\w-]+)\]\]([^\n]*)/g, (_m, label: string, caption: string) => {
    const cap = escapeLatex(caption.trim());
    return [
      "\\begin{figure}[htbp]",
      "  \\centering",
      `  \\includegraphics[width=0.8\\textwidth]{FIXME-${label}}`,
      cap ? `  \\caption{${cap}}` : "  \\caption{}",
      `  \\label{fig:${label}}`,
      "\\end{figure}",
    ].join("\n");
  });

  body = body.replace(/\[\[table:([\w-]+)\]\]([^\n]*)/g, (_m, label: string, caption: string) => {
    const cap = escapeLatex(caption.trim());
    return [
      "\\begin{table}[htbp]",
      "  \\centering",
      cap ? `  \\caption{${cap}}` : "  \\caption{}",
      `  \\label{tab:${label}}`,
      "  % TODO: insert \\begin{tabular}...\\end{tabular} content",
      "\\end{table}",
    ].join("\n");
  });

  body = body.replace(/\[\[eq:([\w-]+)\]\]/g, (_m, label: string) => `\\label{eq:${label}}`);

  body = body.replace(/\[\[ref:([\w-]+)\]\]/g, (_m, label: string) => {
    const found = labelIndex.get(label);
    if (!found) return `\\textbf{[[unresolved ref: ${label}]]}`;
    return `\\ref{${LATEX_PREFIX[found.category]}:${label}}`;
  });

  // Markdown-lite -> LaTeX: headings and bullet lists. Order matters (### before ##).
  body = body.replace(/^### (.+)$/gm, (_m, h: string) => `\\subsection{${escapeLatex(h.trim())}}`);
  body = body.replace(/^## (.+)$/gm, (_m, h: string) => `\\section{${escapeLatex(h.trim())}}`);
  body = body.replace(/^- (.+)$/gm, (_m, item: string) => `\\item ${escapeLatex(item.trim())}`);
  body = wrapItemizeRuns(body);

  const preamble = [
    "\\documentclass[11pt]{article}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage{graphicx}",
    "\\usepackage{amsmath}",
    "\\usepackage{cite}",
    `\\title{${escapeLatex(title.trim() || "Untitled Manuscript")}}`,
    "\\author{}",
    "\\date{}",
    "",
    `% Target journal: ${journal.name} — the \\section/\\subsection skeleton above is`,
    "% generic; swap in the journal's official LaTeX class/template if it has one.",
    "",
    "\\begin{document}",
    "\\maketitle",
    "",
  ].join("\n");

  return `${preamble}${body}\n\n\\end{document}\n`;
}
