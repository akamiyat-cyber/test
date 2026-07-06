// Minimal CSL-JSON (https://citationstyles.org/) item type — the "normal
// form" every reference is converted to on import (BibTeX, RIS, or a
// literature-search API result), and the format the "references" DB table
// stores in its `csl` jsonb column (see supabase/migrations/0001_init.sql).
//
// We deliberately model only the fields our formatters/UI actually use, not
// the full CSL-JSON spec. Storing full CSL-JSON (rather than inventing our
// own shape) means a real CSL processor (e.g. citeproc-js) could be dropped
// in later, against the same stored data, without a migration.

export interface CslAuthor {
  family?: string;
  given?: string;
  /** Used for organizations/collaborations that aren't "family, given". */
  literal?: string;
}

export type CslItemType =
  | "article-journal"
  | "paper-conference"
  | "book"
  | "chapter"
  | "webpage"
  | "report"
  | "thesis"
  | "dataset"
  | "manuscript";

export interface CslItem {
  /** Stable-ish citation key (BibTeX key, DOI-derived, or generated). Not the DB row id. */
  id: string;
  type: CslItemType;
  title?: string;
  author?: CslAuthor[];
  issued?: { "date-parts": [number[]] };
  "container-title"?: string;
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  publisher?: string;
}

export function cslYear(item: CslItem): number | null {
  return item.issued?.["date-parts"]?.[0]?.[0] ?? null;
}

export function cslAuthorsText(item: CslItem): string {
  if (!item.author || item.author.length === 0) return "";
  return item.author.map((a) => a.literal || [a.given, a.family].filter(Boolean).join(" ")).join(", ");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

/** Generates a reasonably stable, human-recognizable CSL id (e.g. "smith2020water"). */
export function makeCslId(item: Pick<CslItem, "author" | "issued" | "title">): string {
  const firstAuthor = item.author?.[0];
  const family = firstAuthor?.family || firstAuthor?.literal?.split(/\s+/).pop() || "ref";
  const year = item.issued?.["date-parts"]?.[0]?.[0] ?? "";
  const titleWord = item.title?.split(/\s+/).find((w) => w.length > 3) ?? "";
  return slugify(`${family}${year}${titleWord}`) || `ref${Date.now()}`;
}

/** A reasonable string key for de-duplicating references: DOI if present, else normalized title+year. */
export function dedupeKey(item: CslItem): string {
  if (item.DOI) return `doi:${item.DOI.toLowerCase().trim()}`;
  const title = (item.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `ty:${title}:${cslYear(item) ?? ""}`;
}
