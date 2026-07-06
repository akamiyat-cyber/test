// Server-only fan-out to the three public literature APIs named in the spec
// (Crossref, Semantic Scholar, PubMed). Each is public/keyless for basic
// search volumes; optional env vars raise rate limits (CONTACT_EMAIL for
// Crossref's "polite pool", SEMANTIC_SCHOLAR_API_KEY, NCBI_API_KEY) but are
// never required. Every provider call is isolated with its own timeout and
// failure handling so one slow/broken provider can't sink the others.

import "server-only";
import type { CslAuthor, CslItem, CslItemType } from "./csl";
import { makeCslId } from "./csl";
import type { ReferenceSearchSource } from "@/types/api";

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function splitFullName(name: string): CslAuthor {
  const trimmed = name.trim();
  if (trimmed.includes(",")) {
    const [family, given] = trimmed.split(",").map((s) => s.trim());
    return { family, given: given || undefined };
  }
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return { literal: trimmed };
  return { family: words[words.length - 1], given: words.slice(0, -1).join(" ") };
}

export interface ProviderResult {
  source: ReferenceSearchSource;
  items: CslItem[];
}

// ---------------------------------------------------------------------------
// Crossref: https://api.crossref.org/swagger-ui/index.html
// ---------------------------------------------------------------------------

const CROSSREF_TYPE_MAP: Record<string, CslItemType> = {
  "journal-article": "article-journal",
  "proceedings-article": "paper-conference",
  book: "book",
  "book-chapter": "chapter",
  report: "report",
  monograph: "report",
  dataset: "dataset",
  "posted-content": "manuscript",
};

interface CrossrefItem {
  type?: string;
  title?: string[];
  author?: { given?: string; family?: string }[];
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  publisher?: string;
  published?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
}

export async function searchCrossref(query: string, limit: number): Promise<CslItem[]> {
  const mailto = process.env.CONTACT_EMAIL ? `&mailto=${encodeURIComponent(process.env.CONTACT_EMAIL)}` : "";
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}${mailto}`;
  const data = (await fetchJson(url)) as { message?: { items?: CrossrefItem[] } };
  const items = data.message?.items ?? [];
  return items.map((it): CslItem => {
    const year = (it.published ?? it["published-print"] ?? it["published-online"])?.["date-parts"]?.[0]?.[0];
    const authors = it.author?.map((a) => ({ family: a.family, given: a.given }));
    const title = it.title?.[0];
    return {
      id: it.DOI ?? makeCslId({ author: authors, issued: year ? { "date-parts": [[year]] } : undefined, title }),
      type: CROSSREF_TYPE_MAP[it.type ?? ""] ?? "article-journal",
      title,
      author: authors,
      issued: year ? { "date-parts": [[year]] } : undefined,
      "container-title": it["container-title"]?.[0],
      volume: it.volume,
      issue: it.issue,
      page: it.page,
      DOI: it.DOI,
      URL: it.URL,
      publisher: it.publisher,
    };
  });
}

// ---------------------------------------------------------------------------
// Semantic Scholar: https://api.semanticscholar.org/api-docs/graph
// ---------------------------------------------------------------------------

interface S2Paper {
  title?: string;
  authors?: { name?: string }[];
  year?: number;
  venue?: string;
  externalIds?: { DOI?: string };
}

export async function searchSemanticScholar(query: string, limit: number): Promise<CslItem[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,venue,externalIds`;
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const data = (await fetchJson(url, { headers })) as { data?: S2Paper[] };
  const items = data.data ?? [];
  return items.map((p): CslItem => {
    const authors = p.authors?.map((a) => splitFullName(a.name ?? ""));
    return {
      id: p.externalIds?.DOI ?? makeCslId({ author: authors, issued: p.year ? { "date-parts": [[p.year]] } : undefined, title: p.title }),
      type: "article-journal",
      title: p.title,
      author: authors,
      issued: p.year ? { "date-parts": [[p.year]] } : undefined,
      "container-title": p.venue || undefined,
      DOI: p.externalIds?.DOI,
    };
  });
}

// ---------------------------------------------------------------------------
// PubMed (NCBI E-utilities): esearch -> esummary
// ---------------------------------------------------------------------------

interface PubmedSummaryAuthor {
  name?: string;
}
interface PubmedSummaryArticleId {
  idtype?: string;
  value?: string;
}
interface PubmedSummary {
  title?: string;
  authors?: PubmedSummaryAuthor[];
  pubdate?: string;
  fulljournalname?: string;
  source?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  articleids?: PubmedSummaryArticleId[];
}

function apiKeyParam(): string {
  return process.env.NCBI_API_KEY ? `&api_key=${encodeURIComponent(process.env.NCBI_API_KEY)}` : "";
}

export async function searchPubmed(query: string, limit: number): Promise<CslItem[]> {
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&term=${encodeURIComponent(query)}${apiKeyParam()}`;
  const searchData = (await fetchJson(searchUrl)) as { esearchresult?: { idlist?: string[] } };
  const ids = searchData.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}${apiKeyParam()}`;
  const summaryData = (await fetchJson(summaryUrl)) as { result?: Record<string, PubmedSummary> };
  const result = summaryData.result ?? {};

  return ids
    .map((id) => result[id])
    .filter((rec): rec is PubmedSummary => !!rec)
    .map((rec): CslItem => {
      const authors = rec.authors?.map((a) => splitFullName(a.name ?? ""));
      const yearMatch = rec.pubdate?.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;
      const doi = rec.articleids?.find((a) => a.idtype === "doi")?.value;
      return {
        id: doi ?? makeCslId({ author: authors, issued: year ? { "date-parts": [[year]] } : undefined, title: rec.title }),
        type: "article-journal",
        title: rec.title,
        author: authors,
        issued: year ? { "date-parts": [[year]] } : undefined,
        "container-title": rec.fulljournalname || rec.source,
        volume: rec.volume,
        issue: rec.issue,
        page: rec.pages,
        DOI: doi,
      };
    });
}

const PROVIDERS: { source: ReferenceSearchSource; search: (q: string, limit: number) => Promise<CslItem[]> }[] = [
  { source: "crossref", search: searchCrossref },
  { source: "semantic-scholar", search: searchSemanticScholar },
  { source: "pubmed", search: searchPubmed },
];

export async function searchAllProviders(
  query: string,
  limit: number,
  sources?: ReferenceSearchSource[]
): Promise<{ results: { source: ReferenceSearchSource; item: CslItem }[]; sourceErrors: { source: ReferenceSearchSource; message: string }[] }> {
  const active = sources ? PROVIDERS.filter((p) => sources.includes(p.source)) : PROVIDERS;
  const settled = await Promise.allSettled(active.map((p) => p.search(query, limit)));

  const results: { source: ReferenceSearchSource; item: CslItem }[] = [];
  const sourceErrors: { source: ReferenceSearchSource; message: string }[] = [];

  settled.forEach((outcome, i) => {
    const { source } = active[i];
    if (outcome.status === "fulfilled") {
      outcome.value.forEach((item) => results.push({ source, item }));
    } else {
      sourceErrors.push({ source, message: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason) });
    }
  });

  return { results, sourceErrors };
}
