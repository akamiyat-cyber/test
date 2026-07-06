// RIS ("Research Information Systems") -> CSL-JSON parser. RIS is a simple
// tagged-line format (EndNote/Zotero/PubMed export default): each record is
// a run of "XX  - value" lines ending with "ER  -".

import type { CslAuthor, CslItem, CslItemType } from "./csl";
import { makeCslId } from "./csl";

const RIS_TYPE_MAP: Record<string, CslItemType> = {
  JOUR: "article-journal",
  JFULL: "article-journal",
  CONF: "paper-conference",
  CPAPER: "paper-conference",
  BOOK: "book",
  CHAP: "chapter",
  THES: "thesis",
  RPRT: "report",
  ELEC: "webpage",
  WEB: "webpage",
  DATA: "dataset",
  UNPD: "manuscript",
  MANSCPT: "manuscript",
  GEN: "manuscript",
};

function parseRisAuthor(raw: string): CslAuthor {
  const trimmed = raw.trim();
  if (trimmed.includes(",")) {
    const [family, given] = trimmed.split(",").map((s) => s.trim());
    return { family, given: given || undefined };
  }
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return { literal: trimmed };
  return { family: words[words.length - 1], given: words.slice(0, -1).join(" ") };
}

function recordToCsl(record: Record<string, string[]>): CslItem {
  const ty = (record.TY?.[0] ?? "").toUpperCase();
  const type = RIS_TYPE_MAP[ty] ?? "manuscript";
  const authorLines = record.AU ?? record.A1 ?? [];
  const authors = authorLines.length ? authorLines.map(parseRisAuthor) : undefined;
  const title = record.TI?.[0] ?? record.T1?.[0];
  const container = record.T2?.[0] ?? record.JO?.[0] ?? record.JF?.[0];
  const yearRaw = record.PY?.[0] ?? record.Y1?.[0];
  const yearMatch = yearRaw?.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;
  const sp = record.SP?.[0];
  const ep = record.EP?.[0];

  return {
    id: makeCslId({ author: authors, issued: year ? { "date-parts": [[year]] } : undefined, title }),
    type,
    title,
    author: authors,
    issued: year ? { "date-parts": [[year]] } : undefined,
    "container-title": container,
    volume: record.VL?.[0],
    issue: record.IS?.[0],
    page: sp && ep ? `${sp}-${ep}` : sp,
    DOI: record.DO?.[0],
    URL: record.UR?.[0],
    publisher: record.PB?.[0],
  };
}

export function parseRis(source: string): { items: CslItem[]; errors: string[] } {
  const items: CslItem[] = [];
  const errors: string[] = [];
  let current: Record<string, string[]> | null = null;

  const flush = () => {
    if (!current) return;
    try {
      items.push(recordToCsl(current));
    } catch (err) {
      errors.push(`Failed to convert a RIS record: ${err instanceof Error ? err.message : String(err)}`);
    }
    current = null;
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([A-Za-z0-9]{2})\s*-\s?(.*)$/);
    if (!match) continue;
    const tag = match[1].toUpperCase();
    const value = match[2].trim();

    if (tag === "TY") {
      flush();
      current = { TY: [value] };
      continue;
    }
    if (!current) continue; // stray line before the first TY
    if (tag === "ER") {
      flush();
      continue;
    }
    (current[tag] ??= []).push(value);
  }
  flush(); // tolerate a missing trailing ER

  return { items, errors };
}
