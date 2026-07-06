// Citation formatting: Vancouver (numbered), Nature (numbered, superscript
// in-text), and APA (author-date) — the three families named in the spec.
//
// This is a small set of hand-written formatters, NOT a full CSL processor
// (no locale files, no arbitrary user-supplied CSL style support). It reads
// the same CSL-JSON items a real processor (e.g. citeproc-js) would, so
// swapping in a real engine later means replacing this module's internals,
// not the data model or the rest of the app.

import type { CitationStyleId } from "@/lib/journalProfiles";
import type { CslAuthor, CslItem } from "./csl";
import { cslYear } from "./csl";

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT_DIGITS[d] ?? d)
    .join("");
}

function authorFamily(a: CslAuthor): string {
  return a.family || a.literal || "";
}

function authorInitials(a: CslAuthor): string {
  if (!a.given) return "";
  return a.given
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() + ".")
    .join("");
}

/** "Smith J" (Vancouver/Nature reference-list style — family + bare initials, no periods between). */
function authorVancouver(a: CslAuthor): string {
  const initials = authorInitials(a).replace(/\./g, "");
  return [authorFamily(a), initials].filter(Boolean).join(" ");
}

/** "Smith, J." (APA reference-list style). */
function authorApa(a: CslAuthor): string {
  const initials = authorInitials(a);
  return initials ? `${authorFamily(a)}, ${initials}` : authorFamily(a);
}

function listAuthorsForEntry(item: CslItem, styleId: CitationStyleId, etAlMax: number): string {
  const authors = item.author ?? [];
  if (authors.length === 0) return "";
  const truncated = authors.length > etAlMax;
  const shown = truncated ? authors.slice(0, etAlMax) : authors;

  if (styleId === "apa") {
    const names = shown.map(authorApa);
    if (truncated) return `${names.join(", ")}, et al.`;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, & ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  }

  // vancouver / nature: comma-separated "Family AB" list.
  const names = shown.map(authorVancouver);
  return truncated ? `${names.join(", ")}, et al.` : names.join(", ");
}

/** Full bibliography-list entry for one reference. `number` is only used for numbered styles. */
export function formatReferenceEntry(
  item: CslItem,
  styleId: CitationStyleId,
  etAlMax: number,
  number?: number
): string {
  const authors = listAuthorsForEntry(item, styleId, etAlMax);
  const year = cslYear(item);
  const title = item.title ?? "Untitled";
  const container = item["container-title"];
  const volIssue = [item.volume, item.issue ? `(${item.issue})` : ""].filter(Boolean).join("");
  const pages = item.page;
  const doi = item.DOI ? `https://doi.org/${item.DOI}` : item.URL;

  // .replace(/\.\s*\./g, ".") guards against a double "." when an optional
  // field (container/year/etc.) that would normally separate two periods is
  // missing — simpler than conditioning every join point on its neighbors.
  if (styleId === "apa") {
    const parts = [
      authors ? `${authors} ` : "",
      year ? `(${year}). ` : "",
      `${title}. `,
      container ? `${container}` : "",
      volIssue ? `, ${volIssue}` : "",
      pages ? `, ${pages}` : "",
      ".",
      doi ? ` ${doi}` : "",
    ];
    return parts.join("").replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim();
  }

  // vancouver / nature
  const prefix = number ? `${number}. ` : "";
  const parts = [
    authors ? `${authors}. ` : "",
    `${title}. `,
    container ? `${container}. ` : "",
    year ? `${year}` : "",
    volIssue ? `;${volIssue}` : "",
    pages ? `:${pages}` : "",
    ".",
    doi ? ` ${doi}` : "",
  ];
  return (prefix + parts.join("")).replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim();
}

/** In-text citation marker to insert at the cursor. `number` = 1-based position in citationOrder (numbered styles only). */
export function formatInTextCitation(item: CslItem, styleId: CitationStyleId, etAlMax: number, number: number): string {
  if (styleId === "nature") return `[${toSuperscript(number)}]`;
  if (styleId === "vancouver") return `[${number}]`;

  // apa: author-date, doesn't need a running number.
  const authors = item.author ?? [];
  const year = cslYear(item) ?? "n.d.";
  if (authors.length === 0) return `(${item.title ?? "n.d."}, ${year})`;
  if (authors.length > etAlMax) return `(${authorFamily(authors[0])} et al., ${year})`;
  if (authors.length === 1) return `(${authorFamily(authors[0])}, ${year})`;
  if (authors.length === 2) return `(${authorFamily(authors[0])} & ${authorFamily(authors[1])}, ${year})`;
  return `(${authors.slice(0, -1).map(authorFamily).join(", ")}, & ${authorFamily(authors[authors.length - 1])}, ${year})`;
}

export interface OrderedReference {
  id: string;
  item: CslItem;
}

/**
 * Orders references for the formatted bibliography list:
 * - numbered styles (vancouver/nature): citation order first (as tracked by
 *   the app when the user inserts a citation), then any never-cited
 *   references appended in library order.
 * - apa: alphabetical by first author family name, then year.
 */
export function orderReferencesForBibliography(
  references: OrderedReference[],
  styleId: CitationStyleId,
  citationOrder: string[]
): OrderedReference[] {
  if (styleId === "apa") {
    return [...references].sort((a, b) => {
      const familyA = authorFamily(a.item.author?.[0] ?? {}).toLowerCase();
      const familyB = authorFamily(b.item.author?.[0] ?? {}).toLowerCase();
      if (familyA !== familyB) return familyA < familyB ? -1 : 1;
      return (cslYear(a.item) ?? 0) - (cslYear(b.item) ?? 0);
    });
  }

  const byId = new Map(references.map((r) => [r.id, r]));
  const cited = citationOrder.map((id) => byId.get(id)).filter((r): r is OrderedReference => !!r);
  const citedIds = new Set(cited.map((r) => r.id));
  const uncited = references.filter((r) => !citedIds.has(r.id));
  return [...cited, ...uncited];
}
