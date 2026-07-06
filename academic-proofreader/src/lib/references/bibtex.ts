// Hand-written BibTeX -> CSL-JSON parser. Deliberately not a full BibTeX
// implementation (no @string macros/crossref inheritance) — it covers the
// common case (Zotero/EndNote/Google Scholar exports) which is brace- or
// quote-delimited fields on `@type{key, field = {value}, ...}` entries.

import type { CslAuthor, CslItem, CslItemType } from "./csl";

const BIBTEX_TYPE_MAP: Record<string, CslItemType> = {
  article: "article-journal",
  inproceedings: "paper-conference",
  conference: "paper-conference",
  proceedings: "paper-conference",
  book: "book",
  incollection: "chapter",
  inbook: "chapter",
  phdthesis: "thesis",
  mastersthesis: "thesis",
  techreport: "report",
  unpublished: "manuscript",
  online: "webpage",
  misc: "webpage",
};

function stripBraces(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function parseBibtexAuthors(raw: string): CslAuthor[] {
  return raw
    .split(/\s+and\s+/i)
    .map((part) => stripBraces(part.trim()) ?? "")
    .filter(Boolean)
    .map((name): CslAuthor => {
      if (name.includes(",")) {
        const [family, given] = name.split(",").map((s) => s.trim());
        return { family, given: given || undefined };
      }
      const words = name.split(/\s+/);
      if (words.length === 1) return { literal: name };
      return { family: words[words.length - 1], given: words.slice(0, -1).join(" ") };
    });
}

function entryToCsl(entryType: string, citeKey: string, fields: Record<string, string>): CslItem {
  const yearNum = fields.year ? parseInt(fields.year, 10) : NaN;
  return {
    id: citeKey,
    type: BIBTEX_TYPE_MAP[entryType] ?? "manuscript",
    title: stripBraces(fields.title),
    author: fields.author ? parseBibtexAuthors(fields.author) : undefined,
    issued: !Number.isNaN(yearNum) ? { "date-parts": [[yearNum]] } : undefined,
    "container-title": stripBraces(fields.journal || fields.booktitle),
    volume: fields.volume,
    issue: fields.number,
    page: fields.pages?.replace(/-{2,}/g, "-"),
    DOI: fields.doi,
    URL: fields.url,
    publisher: stripBraces(fields.publisher),
  };
}

export function parseBibtex(source: string): { items: CslItem[]; errors: string[] } {
  const items: CslItem[] = [];
  const errors: string[] = [];
  const text = source;
  const n = text.length;
  let i = 0;

  const isSpace = (ch: string) => /\s/.test(ch);
  function skipWhitespace() {
    while (i < n && isSpace(text[i])) i++;
  }

  while (i < n) {
    while (i < n && text[i] !== "@") i++;
    if (i >= n) break;
    i++; // skip '@'

    const typeStart = i;
    while (i < n && /[a-zA-Z]/.test(text[i])) i++;
    const entryType = text.slice(typeStart, i).toLowerCase();
    skipWhitespace();

    if (text[i] !== "{" && text[i] !== "(") {
      errors.push(`Skipped malformed "@${entryType}" entry (no opening brace).`);
      continue;
    }
    const closeChar = text[i] === "{" ? "}" : ")";
    i++; // skip opening brace/paren

    if (entryType === "comment" || entryType === "string" || entryType === "preamble") {
      let depth = 1;
      while (i < n && depth > 0) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        i++;
      }
      continue;
    }

    const keyStart = i;
    while (i < n && text[i] !== "," && text[i] !== closeChar) i++;
    const citeKey = text.slice(keyStart, i).trim();
    if (text[i] === ",") i++;

    const fields: Record<string, string> = {};
    let depth = 1;
    while (i < n && depth > 0) {
      skipWhitespace();
      if (text[i] === closeChar) {
        depth--;
        i++;
        break;
      }
      if (text[i] === "," || i >= n) {
        i++;
        continue;
      }

      const fieldNameStart = i;
      while (i < n && /[a-zA-Z0-9_-]/.test(text[i])) i++;
      const fieldName = text.slice(fieldNameStart, i).toLowerCase();
      skipWhitespace();
      if (text[i] !== "=") {
        while (i < n && text[i] !== "," && text[i] !== closeChar) i++;
        continue;
      }
      i++; // skip '='
      skipWhitespace();

      let value = "";
      if (text[i] === "{") {
        i++;
        const valStart = i;
        let braceDepth = 1;
        while (i < n && braceDepth > 0) {
          if (text[i] === "{") braceDepth++;
          else if (text[i] === "}") {
            braceDepth--;
            if (braceDepth === 0) break;
          }
          i++;
        }
        value = text.slice(valStart, i);
        i++; // skip closing '}'
      } else if (text[i] === '"') {
        i++;
        const valStart = i;
        while (i < n && text[i] !== '"') i++;
        value = text.slice(valStart, i);
        i++; // skip closing '"'
      } else {
        const valStart = i;
        while (i < n && text[i] !== "," && text[i] !== closeChar) i++;
        value = text.slice(valStart, i).trim();
      }

      if (fieldName) fields[fieldName] = value.replace(/\s+/g, " ").trim();
      skipWhitespace();
      if (text[i] === ",") i++;
    }

    if (!citeKey) {
      errors.push(`Skipped an "@${entryType}" entry with no citation key.`);
      continue;
    }
    try {
      items.push(entryToCsl(entryType, citeKey, fields));
    } catch (err) {
      errors.push(`Failed to convert entry "${citeKey}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { items, errors };
}
