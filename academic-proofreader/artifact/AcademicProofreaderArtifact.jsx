// Academic English Proofreader — Claude Artifact edition.
//
// This is a single self-contained React component meant to be pasted into a
// claude.ai (or Claude Desktop) conversation and rendered as an Artifact. It
// intentionally avoids anything an Artifact sandbox can't do:
//   - No server / API routes: proofreading calls go through the artifact's
//     built-in `window.claude.complete(prompt)` completion API instead of the
//     Anthropic SDK, so no API key is needed (and none could be kept secret
//     in a client-only sandbox anyway).
//   - No npm installs beyond React: everything (journal profiles, style
//     presets, diff logic, prompt building) is inlined in this one file.
//   - No localStorage/sessionStorage: Artifacts run in a sandboxed iframe
//     without reliable persistent storage, so whitelist/version history/
//     comments/drafts are plain in-memory React state and are lost on
//     refresh. This is the main functional difference from the full Next.js
//     app in ../src, which persists everything to localStorage.
//   - No .docx export: the `docx` npm package isn't available in the
//     Artifact sandbox, so this version offers "copy" and a plain-text
//     download instead.
//
// Usage: open a new conversation on claude.ai, paste this entire file, and
// ask Claude to "render this as an artifact". `window.claude.complete` only
// exists inside that Artifact host — running this file anywhere else will
// hit the "Claude completion API is not available" error state below.

import React, { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Domain data (condensed from src/lib/journalProfiles.ts, stylePresets.ts,
// whitelistPresets.ts in the full app)
// ---------------------------------------------------------------------------

const journalProfiles = [
  {
    id: "general",
    name: "General",
    activeVoice: "Balanced use of active and passive voice; prefer active where it improves clarity.",
    firstPerson: "\"We\" is acceptable when it clarifies who performed an action.",
    sentenceLength: "Moderate length; prioritize clarity over strict brevity.",
    headings: ["Title", "Abstract", "Introduction", "Materials and Methods", "Results", "Discussion", "Conclusion", "References"],
    referenceStyle: "No specific house style enforced; follow a consistent, recognized citation format.",
    wordLimits: { abstract: null, mainText: null, figureCaption: null },
  },
  {
    id: "nature",
    name: "Nature",
    activeVoice: "Strong preference for active voice and direct, concise statements.",
    firstPerson: "\"We\" is standard and encouraged over passive constructions.",
    sentenceLength: "Short, punchy sentences; avoid long compound/run-on sentences.",
    headings: ["Title", "Abstract", "Main", "Methods", "Data Availability", "References"],
    referenceStyle: "Numbered, superscript citation style; list all authors up to 5, et al. beyond 5.",
    wordLimits: { abstract: 150, mainText: 3000, figureCaption: 350 },
  },
  {
    id: "science",
    name: "Science",
    activeVoice: "Prefers active voice; direct, declarative sentence structure.",
    firstPerson: "\"We\" is standard for describing the authors' actions.",
    sentenceLength: "Concise sentences; avoid nested clauses where possible.",
    headings: ["Title", "Abstract", "Introduction", "Results", "Discussion", "Materials and Methods", "References and Notes"],
    referenceStyle: "Numbered citation style in order of appearance; up to 5 authors, et al. beyond 5.",
    wordLimits: { abstract: 125, mainText: 2500, figureCaption: 300 },
  },
  {
    id: "pnas",
    name: "PNAS",
    activeVoice: "Active voice preferred for describing author actions and findings.",
    firstPerson: "\"We\" is acceptable and common.",
    sentenceLength: "Moderate length, favoring clarity and a formal academic register.",
    headings: ["Title", "Significance Statement", "Abstract", "Introduction", "Results", "Discussion", "Materials and Methods", "References"],
    referenceStyle: "Numbered citations; abbreviated journal names; up to 5 authors, et al. beyond 5.",
    wordLimits: { abstract: 250, mainText: 6000, figureCaption: 350 },
  },
  {
    id: "plos-one",
    name: "PLOS ONE",
    activeVoice: "Active voice encouraged, but clarity takes priority over strict rules.",
    firstPerson: "\"We\" is standard and widely used.",
    sentenceLength: "Clear, moderate-length sentences; plain language encouraged.",
    headings: ["Title", "Abstract", "Introduction", "Materials and Methods", "Results", "Discussion", "Conclusion", "References"],
    referenceStyle: "Vancouver numbered style; reference list in citation order.",
    wordLimits: { abstract: 300, mainText: null, figureCaption: null },
  },
  {
    id: "bioinformatics",
    name: "Bioinformatics",
    activeVoice: "Active voice preferred, especially in Methods and Results.",
    firstPerson: "\"We\" is standard for describing implementation and analysis steps.",
    sentenceLength: "Technical, precise sentences; avoid unnecessary hedging or verbosity.",
    headings: ["Title", "Abstract", "1 Introduction", "2 Materials and Methods", "3 Results", "4 Discussion", "References"],
    referenceStyle: "Author-year (Harvard) in text; et al. after 2 authors; alphabetical reference list.",
    wordLimits: { abstract: 250, mainText: null, figureCaption: null },
  },
];

const stylePresets = [
  {
    id: "general-academic",
    name: "General Academic",
    instruction:
      "Write in clear, formal academic English. Favor precision over aggressive shortening; keep explanatory clauses when they aid understanding.",
  },
  {
    id: "concise",
    name: "Concise / Word-limit Focused",
    instruction:
      "Prioritize conciseness above all else. Remove redundant words/phrases, merge short sentences, and cut hedging language, even if it means restructuring sentences, as long as meaning is fully preserved.",
  },
  {
    id: "formal-british",
    name: "Formal (British English)",
    instruction: "Write in formal academic British English (e.g., 'colour', 'analyse'). Maintain a formal, precise tone.",
  },
  {
    id: "formal-american",
    name: "Formal (American English)",
    instruction: "Write in formal academic American English (e.g., 'color', 'analyze'). Maintain a formal, precise tone.",
  },
];

const whitelistPresets = [
  { id: "agronomy", name: "農学 (Agronomy)", terms: ["AWD", "alternate wetting and drying", "GHG", "N2O", "CH4", "SOC", "NPK"] },
  { id: "genetics", name: "遺伝学 (Genetics)", terms: ["GWAS", "SNP", "QTL", "PCR", "qPCR", "RNA-seq", "CRISPR"] },
  { id: "bioinformatics", name: "生命情報学 (Bioinformatics)", terms: ["BLAST", "FASTA", "FASTQ", "k-mer", "in silico", "in vitro", "in vivo"] },
  { id: "clinical", name: "臨床医学 (Clinical Medicine)", terms: ["RCT", "CI", "OR", "HR", "ITT", "PFS", "OS"] },
];

const categoryLabels = {
  grammar: { en: "Grammar", ja: "文法" },
  style: { en: "Academic style", ja: "学術語彙・文体" },
  clarity: { en: "Clarity", ja: "明確さ" },
  conciseness: { en: "Conciseness", ja: "簡潔さ" },
  consistency: { en: "Consistency", ja: "一貫性" },
};

const categoryColors = {
  grammar: "bg-rose-100 text-rose-700 border-rose-200",
  style: "bg-purple-100 text-purple-700 border-purple-200",
  clarity: "bg-sky-100 text-sky-700 border-sky-200",
  conciseness: "bg-amber-100 text-amber-700 border-amber-200",
  consistency: "bg-teal-100 text-teal-700 border-teal-200",
};

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function countWords(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function extractJSON(raw) {
  const trimmed = String(raw || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("モデルの応答からJSONを取り出せませんでした。");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

// Sequentially locates each correction's `original` snippet in the source
// text to build an ordered list of plain/tracked-change segments. Mirrors
// src/lib/diffSegments.ts in the full app.
function buildDiffSegments(sourceText, corrections) {
  const segments = [];
  let cursor = 0;
  corrections.forEach((correction, i) => {
    if (!correction.original) return;
    let idx = sourceText.indexOf(correction.original, cursor);
    if (idx === -1) idx = sourceText.indexOf(correction.original);
    if (idx === -1) return;
    if (idx > cursor) segments.push({ type: "plain", key: `p-${i}-${cursor}`, text: sourceText.slice(cursor, idx) });
    segments.push({ type: "correction", key: `c-${correction.id}`, correction });
    cursor = idx + correction.original.length;
  });
  if (cursor < sourceText.length) segments.push({ type: "plain", key: `tail-${cursor}`, text: sourceText.slice(cursor) });
  return segments;
}

function computeFinalText(sourceText, corrections) {
  return buildDiffSegments(sourceText, corrections)
    .map((seg) => (seg.type === "plain" ? seg.text : seg.correction.status === "rejected" ? seg.correction.original : seg.correction.revised))
    .join("");
}

async function callClaude(prompt) {
  // `window.claude` is injected by the Artifact host at runtime; it has no
  // ambient type declaration, hence the `any` cast.
  const claudeHost = typeof window !== "undefined" ? window["claude"] : undefined;
  if (!claudeHost || typeof claudeHost.complete !== "function") {
    throw new Error(
      "Claude completion API (window.claude.complete) が見つかりません。このコンポーネントは claude.ai / Claude Desktop 上で Artifact として実行してください。"
    );
  }
  return claudeHost.complete(prompt);
}

function buildProofreadPrompt({ mode, text, journal, style, whitelist }) {
  const limit = mode === "caption" ? journal.wordLimits.figureCaption : journal.wordLimits.mainText;
  return `You are an expert academic English editor for peer-reviewed scientific journals (in the style of Paperpal/Editage). Analyze the text for: (1) grammar/spelling, (2) academic register (colloquial -> formal), (3) conciseness, (4) voice/tense consistency, (5) word/phrase repetition.

Return STRICT JSON only, no markdown fences, no commentary, matching exactly:
{
  "corrections": [{ "original": "verbatim substring from the source text", "revised": "corrected text", "reason": "brief English reason", "reasonJa": "same reason in Japanese", "category": "grammar"|"style"|"clarity"|"conciseness"|"consistency" }],
  "revisedFullText": "full text with all corrections applied",
  "wordCount": { "current": 0, "limit": ${limit ?? 0} },
  "consistencyIssues": [{ "term": "canonical term", "variants": ["v1","v2"], "suggestion": "which form to standardize on and why" }]
}
Rules: "original" must be an exact, short, unambiguous verbatim substring of the source text, in reading order. Don't flag whitelisted terms themselves (only surrounding grammar), but DO still flag them in consistencyIssues if used inconsistently. If nothing to fix, return an empty corrections array and revisedFullText equal to the source.

Journal: ${journal.name}
Style guidelines: active voice - ${journal.activeVoice} | first person - ${journal.firstPerson} | sentence length - ${journal.sentenceLength}
Writing style preset: ${style.name}. ${style.instruction}
Word limit for this text: ${limit ?? 0} (0 = no limit)
Whitelisted terms (do not rewrite themselves): ${whitelist.length ? whitelist.join(", ") : "None."}
${mode === "caption" ? "The text is one or more figure/table captions; don't flag normal caption terseness as a grammar error." : "The text is the main manuscript body or a section of it."}

--- SOURCE TEXT START ---
${text}
--- SOURCE TEXT END ---

Respond with the JSON object only.`;
}

function buildCoverLetterPrompt({ revisedText, journal, title, authorNotes }) {
  return `Draft a formal cover letter (plain text only, no markdown/JSON) to the Editor of "${journal.name}" for the manuscript below.
${title ? `Title: ${title}` : ""}
${authorNotes ? `Additional notes: ${authorNotes}` : ""}
Address "Dear Editor,", briefly state the topic/main finding, explain novelty and fit with ${journal.name}, confirm originality (standard boilerplate), close with "[Corresponding Author Name]". Stay under ~400 words.

Manuscript text:
--- START ---
${revisedText}
--- END ---`;
}

function buildReviewerResponsePrompt({ reviewerComments, revisedText, journal }) {
  return `Draft a "Response to Reviewers" document (plain text only) for a manuscript revision submitted to "${journal.name}".
Reviewer comments:
--- COMMENTS START ---
${reviewerComments}
--- COMMENTS END ---
Revised manuscript (for reference):
--- MANUSCRIPT START ---
${revisedText}
--- MANUSCRIPT END ---
Group by reviewer if distinguishable. For each point: "Comment:" (brief quote/paraphrase) then "Response:" (courteous, specific, referencing concrete changes where plausible).`;
}

// ---------------------------------------------------------------------------
// UI subcomponents
// ---------------------------------------------------------------------------

function WordCountBadge({ text, limit }) {
  const current = countWords(text);
  const over = !!limit && current > limit;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${over ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {current} {limit ? `/ ${limit} words` : "words"} {over && <span className="font-semibold">超過</span>}
    </span>
  );
}

function CorrectionPopover({ correction, reasonLanguage, onAccept, onReject, onClose }) {
  const reason = reasonLanguage === "ja" ? correction.reasonJa : correction.reason;
  return (
    <div className="absolute z-30 top-full left-0 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="flex items-start justify-between">
        <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${categoryColors[correction.category] || ""}`}>
          {categoryLabels[correction.category]?.[reasonLanguage] || correction.category}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button>
      </div>
      <p className="mt-2 text-slate-600 line-through">{correction.original}</p>
      <p className="mt-1 font-medium text-slate-900">{correction.revised}</p>
      <p className="mt-2 text-slate-500">{reason}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onAccept} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700">Accept</button>
        <button onClick={onReject} className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700">Reject</button>
      </div>
    </div>
  );
}

function DiffView({ sourceText, corrections, reasonLanguage, onStatusChange }) {
  const [openId, setOpenId] = useState(null);
  const segments = useMemo(() => buildDiffSegments(sourceText, corrections), [sourceText, corrections]);

  if (!sourceText.trim()) return <p className="text-sm text-slate-400">校正結果はここに表示されます。</p>;

  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
      {segments.map((seg) => {
        if (seg.type === "plain") return <span key={seg.key}>{seg.text}</span>;
        const c = seg.correction;
        let content;
        if (c.status === "rejected") {
          content = <span className="border-b border-dotted border-slate-400 text-slate-500">{c.original}</span>;
        } else if (c.status === "accepted") {
          content = <span className="rounded bg-emerald-50 px-0.5 text-emerald-800">{c.revised}</span>;
        } else {
          content = (
            <>
              <span className="text-rose-500/80 line-through decoration-rose-400">{c.original}</span>{" "}
              <span className="rounded bg-emerald-50 px-0.5 font-medium text-emerald-800 underline decoration-emerald-500 decoration-2 underline-offset-2">
                {c.revised}
              </span>
            </>
          );
        }
        return (
          <span key={seg.key} className="relative inline cursor-pointer" onClick={() => setOpenId((cur) => (cur === c.id ? null : c.id))}>
            {content}
            {openId === c.id && (
              <CorrectionPopover
                correction={c}
                reasonLanguage={reasonLanguage}
                onAccept={() => { onStatusChange(c.id, "accepted"); setOpenId(null); }}
                onReject={() => { onStatusChange(c.id, "rejected"); setOpenId(null); }}
                onClose={() => setOpenId(null)}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

function CorrectionsList({ corrections, reasonLanguage, onStatusChange }) {
  if (corrections.length === 0) return <p className="text-sm text-slate-400">修正候補はありません。</p>;
  return (
    <ul className="space-y-2">
      {corrections.map((c) => {
        const statusLabel = c.status === "accepted" ? { t: "Accepted", cls: "text-emerald-600" } : c.status === "rejected" ? { t: "Rejected", cls: "text-rose-600" } : { t: "Pending", cls: "text-slate-400" };
        return (
          <li key={c.id} className="rounded-md border border-slate-200 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${categoryColors[c.category] || ""}`}>
                {categoryLabels[c.category]?.[reasonLanguage] || c.category}
              </span>
              <span className={`text-[11px] font-medium ${statusLabel.cls}`}>{statusLabel.t}</span>
            </div>
            <p className="mt-1.5 text-slate-500 line-through">{c.original}</p>
            <p className="mt-0.5 font-medium text-slate-900">{c.revised}</p>
            <p className="mt-1 text-slate-500">{reasonLanguage === "ja" ? c.reasonJa : c.reason}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => onStatusChange(c.id, "accepted")} disabled={c.status === "accepted"} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40">Accept</button>
              <button onClick={() => onStatusChange(c.id, "rejected")} disabled={c.status === "rejected"} className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700 disabled:opacity-40">Reject</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ConsistencyPanel({ issues }) {
  if (issues.length === 0) return <p className="text-sm text-slate-400">用語の表記ゆれ・未定義の略語は見つかりませんでした。</p>;
  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => (
        <li key={i} className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs">
          <p className="font-medium text-amber-900">{issue.term}</p>
          <p className="mt-1 text-amber-800">表記ゆれ: {(issue.variants || []).join(" / ")}</p>
          <p className="mt-1 text-amber-700">{issue.suggestion}</p>
        </li>
      ))}
    </ul>
  );
}

function ExportButtons({ text, filenameBase }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            // clipboard API may be blocked in the sandbox; ignore silently
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        disabled={!text.trim()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        {copied ? "Copied!" : "Copy text"}
      </button>
      <button
        onClick={() => {
          const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filenameBase}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        disabled={!text.trim()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        Download .txt
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AcademicProofreaderArtifact() {
  const [journalId, setJournalId] = useState("general");
  const [stylePresetId, setStylePresetId] = useState("general-academic");
  const [reasonLanguage, setReasonLanguage] = useState("en");
  const [whitelist, setWhitelist] = useState([]);
  const [whitelistInput, setWhitelistInput] = useState("");
  const [activeTab, setActiveTab] = useState("body");

  const [mainText, setMainText] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [reviewerCommentsText, setReviewerCommentsText] = useState("");

  const [mainResult, setMainResult] = useState(null);
  const [captionResult, setCaptionResult] = useState(null);
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [errorMain, setErrorMain] = useState(null);
  const [errorCaption, setErrorCaption] = useState(null);

  const [coverLetter, setCoverLetter] = useState("");
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverTitle, setCoverTitle] = useState("");
  const [coverNotes, setCoverNotes] = useState("");

  const [reviewerResponse, setReviewerResponse] = useState("");
  const [loadingReviewerResponse, setLoadingReviewerResponse] = useState(false);
  const [errorReviewerResponse, setErrorReviewerResponse] = useState(null);

  const journal = journalProfiles.find((j) => j.id === journalId) || journalProfiles[0];
  const style = stylePresets.find((s) => s.id === stylePresetId) || stylePresets[0];

  async function runProofread(mode) {
    const text = mode === "body" ? mainText : captionText;
    if (!text.trim()) return;
    const setLoading = mode === "body" ? setLoadingMain : setLoadingCaption;
    const setError = mode === "body" ? setErrorMain : setErrorCaption;
    const setResult = mode === "body" ? setMainResult : setCaptionResult;
    setLoading(true);
    setError(null);
    try {
      const prompt = buildProofreadPrompt({ mode, text, journal, style, whitelist: whitelist.map((w) => w.term) });
      const raw = extractJSON(await callClaude(prompt));
      const result = {
        corrections: (raw.corrections || []).map((c) => ({ id: genId("corr"), status: "pending", ...c })),
        revisedFullText: raw.revisedFullText || text,
        wordCount: raw.wordCount || { current: countWords(text), limit: 0 },
        consistencyIssues: raw.consistencyIssues || [],
      };
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function setCorrectionStatus(mode, id, status) {
    const setResult = mode === "body" ? setMainResult : setCaptionResult;
    setResult((prev) => (prev ? { ...prev, corrections: prev.corrections.map((c) => (c.id === id ? { ...c, status } : c)) } : prev));
  }

  function acceptAll(mode) {
    const setResult = mode === "body" ? setMainResult : setCaptionResult;
    setResult((prev) => (prev ? { ...prev, corrections: prev.corrections.map((c) => ({ ...c, status: "accepted" })) } : prev));
  }

  function rejectAll(mode) {
    const setResult = mode === "body" ? setMainResult : setCaptionResult;
    setResult((prev) => (prev ? { ...prev, corrections: prev.corrections.map((c) => ({ ...c, status: "rejected" })) } : prev));
  }

  async function generateCoverLetter() {
    const text = (mainResult && mainResult.revisedFullText) || mainText;
    if (!text.trim()) return;
    setLoadingCoverLetter(true);
    try {
      const letter = await callClaude(buildCoverLetterPrompt({ revisedText: text, journal, title: coverTitle, authorNotes: coverNotes }));
      setCoverLetter(letter.trim());
    } catch (err) {
      setCoverLetter(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingCoverLetter(false);
    }
  }

  async function generateReviewerResponse() {
    if (!reviewerCommentsText.trim()) return;
    setLoadingReviewerResponse(true);
    setErrorReviewerResponse(null);
    try {
      const text = (mainResult && mainResult.revisedFullText) || mainText;
      const response = await callClaude(buildReviewerResponsePrompt({ reviewerComments: reviewerCommentsText, revisedText: text, journal }));
      setReviewerResponse(response.trim());
    } catch (err) {
      setErrorReviewerResponse(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingReviewerResponse(false);
    }
  }

  function addWhitelistTerm(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setWhitelist((prev) => (prev.some((t) => t.term.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, { id: genId("wl"), term: trimmed }]));
  }

  function applyWhitelistPreset(presetId) {
    const preset = whitelistPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setWhitelist((prev) => {
      const existing = new Set(prev.map((t) => t.term.toLowerCase()));
      return [...prev, ...preset.terms.filter((t) => !existing.has(t.toLowerCase())).map((t) => ({ id: genId("wl"), term: t }))];
    });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
        <div>
          <h1 className="text-base font-bold text-slate-800">Academic English Proofreader</h1>
          <p className="mt-0.5 text-xs text-slate-500">学術英語校正アシスタント（Artifact版）</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">ジャーナル</label>
          <select value={journalId} onChange={(e) => setJournalId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400">
            {journalProfiles.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">文体プリセット</label>
          <select value={stylePresetId} onChange={(e) => setStylePresetId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400">
            {stylePresets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">修正理由の表示言語</label>
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            {["en", "ja"].map((lang) => (
              <button key={lang} onClick={() => setReasonLanguage(lang)} className={`flex-1 rounded px-2 py-1 font-medium ${reasonLanguage === lang ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {lang === "en" ? "English" : "日本語"}
              </button>
            ))}
          </div>
        </div>

        <details className="rounded-md border border-slate-200 bg-white p-2.5" open>
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">ジャーナル・フォーマット情報</summary>
          <div className="mt-2 space-y-2 text-xs text-slate-600">
            <p><span className="font-semibold text-slate-700">能動態:</span> {journal.activeVoice}</p>
            <p><span className="font-semibold text-slate-700">一人称:</span> {journal.firstPerson}</p>
            <p><span className="font-semibold text-slate-700">文の長さ:</span> {journal.sentenceLength}</p>
            <p><span className="font-semibold text-slate-700">見出し構成:</span> {journal.headings.join(" → ")}</p>
            <p><span className="font-semibold text-slate-700">参考文献:</span> {journal.referenceStyle}</p>
            <p><span className="font-semibold text-slate-700">制限語数:</span> 要旨 {journal.wordLimits.abstract ?? "なし"} / 本文 {journal.wordLimits.mainText ?? "なし"} / キャプション {journal.wordLimits.figureCaption ?? "なし"}</p>
          </div>
        </details>

        <details className="rounded-md border border-slate-200 bg-white p-2.5" open>
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">専門用語ホワイトリスト</summary>
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {whitelistPresets.map((preset) => (
                <button key={preset.id} onClick={() => applyWhitelistPreset(preset.id)} className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50">+ {preset.name}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                placeholder="例: GWAS"
                className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                onKeyDown={(e) => { if (e.key === "Enter" && whitelistInput.trim()) { addWhitelistTerm(whitelistInput); setWhitelistInput(""); } }}
              />
              <button onClick={() => { if (whitelistInput.trim()) { addWhitelistTerm(whitelistInput); setWhitelistInput(""); } }} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900">追加</button>
            </div>
            {whitelist.length === 0 ? (
              <p className="text-xs text-slate-400">登録された用語はありません。</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {whitelist.map((t) => (
                  <li key={t.id} className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                    {t.term}
                    <button onClick={() => setWhitelist((prev) => prev.filter((x) => x.id !== t.id))} className="text-indigo-400 hover:text-indigo-700">×</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-400">※このArtifact版ではリロードするとリセットされます（localStorage未使用）。</p>
          </div>
        </details>
      </aside>

      <div className="flex h-full flex-1 flex-col overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {[["body", "本文校正"], ["caption", "図表キャプション"], ["reviewer", "査読対応"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${activeTab === id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>
            ))}
          </div>
          <button onClick={() => setShowCoverLetter(true)} className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">カバーレター生成</button>
        </div>

        <div className="min-h-0 flex-1">
          {activeTab === "body" &&
            <ProofreadPaneBody
              mode="body" text={mainText} setText={setMainText} result={mainResult} loading={loadingMain} error={errorMain}
              limit={journal.wordLimits.mainText} finalText={mainResult ? computeFinalText(mainText, mainResult.corrections) : mainText}
              runProofread={runProofread} acceptAll={acceptAll} rejectAll={rejectAll} setCorrectionStatus={setCorrectionStatus}
              reasonLanguage={reasonLanguage} placeholder="原稿本文をここに貼り付け、または入力してください..."
            />}
          {activeTab === "caption" &&
            <ProofreadPaneBody
              mode="caption" text={captionText} setText={setCaptionText} result={captionResult} loading={loadingCaption} error={errorCaption}
              limit={journal.wordLimits.figureCaption} finalText={captionResult ? computeFinalText(captionText, captionResult.corrections) : captionText}
              runProofread={runProofread} acceptAll={acceptAll} rejectAll={rejectAll} setCorrectionStatus={setCorrectionStatus}
              reasonLanguage={reasonLanguage} placeholder="Figure/Table のキャプションをここに貼り付けてください..."
            />}
          {activeTab === "reviewer" && (
            <div className="grid h-full grid-cols-2 gap-4">
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-2.5"><span className="text-sm font-semibold text-slate-700">レビューアーコメント</span></div>
                <div className="flex-1 overflow-y-auto">
                  <textarea value={reviewerCommentsText} onChange={(e) => setReviewerCommentsText(e.target.value)} placeholder="レビューアーからのコメントをここに貼り付けてください..." spellCheck={false} className="h-full w-full resize-none border-0 bg-transparent p-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400" />
                </div>
                <div className="border-t border-slate-200 p-3">
                  <button onClick={generateReviewerResponse} disabled={loadingReviewerResponse || !reviewerCommentsText.trim()} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
                    {loadingReviewerResponse ? "生成中..." : "Response to Reviewers を生成"}
                  </button>
                </div>
              </div>
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-2.5"><span className="text-sm font-semibold text-slate-700">回答の下書き</span></div>
                {errorReviewerResponse && <div className="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorReviewerResponse}</div>}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingReviewerResponse && <p className="text-sm text-slate-400">Claude が回答を作成しています...</p>}
                  {!loadingReviewerResponse && !reviewerResponse && <p className="text-sm text-slate-400">コメントを貼り付けて生成ボタンを押してください。</p>}
                  {reviewerResponse && <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{reviewerResponse}</p>}
                </div>
                {reviewerResponse && <div className="border-t border-slate-200 p-3"><ExportButtons text={reviewerResponse} filenameBase="response-to-reviewers" /></div>}
              </div>
            </div>
          )}
        </div>

        {showCoverLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-800">カバーレター生成</h2>
                <button onClick={() => setShowCoverLetter(false)} className="text-slate-400 hover:text-slate-700">×</button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">論文タイトル（任意）</label>
                  <input value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">補足情報（任意）</label>
                  <textarea value={coverNotes} onChange={(e) => setCoverNotes(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" placeholder="強調したい新規性や背景など" />
                </div>
                <button onClick={generateCoverLetter} disabled={loadingCoverLetter} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
                  {loadingCoverLetter ? "生成中..." : "生成する"}
                </button>
                {coverLetter && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">下書き</label>
                      <button onClick={() => navigator.clipboard.writeText(coverLetter)} className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">Copy</button>
                    </div>
                    <textarea readOnly value={coverLetter} rows={12} className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700 outline-none" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProofreadPaneBody({ mode, text, setText, result, loading, error, limit, finalText, runProofread, acceptAll, rejectAll, setCorrectionStatus, reasonLanguage, placeholder }) {
  const [subTab, setSubTab] = useState("diff");

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">原文</span>
          <WordCountBadge text={text} limit={limit} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} spellCheck={false} className="h-full w-full resize-none border-0 bg-transparent p-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400" />
        </div>
        <div className="border-t border-slate-200 p-3">
          <button onClick={() => runProofread(mode)} disabled={loading || !text.trim()} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
            {loading ? "校正中..." : "校正"}
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">校正結果</span>
          {result && (
            <div className="flex items-center gap-2">
              <button onClick={() => acceptAll(mode)} className="rounded border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">Accept All</button>
              <button onClick={() => rejectAll(mode)} className="rounded border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50">Reject All</button>
            </div>
          )}
        </div>
        {error && <div className="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-2">
          {[["diff", "差分表示"], ["list", `修正リスト${result ? ` (${result.corrections.length})` : ""}`], ["consistency", `一貫性チェック${result ? ` (${result.consistencyIssues.length})` : ""}`]].map(([id, label]) => (
            <button key={id} onClick={() => setSubTab(id)} className={`whitespace-nowrap rounded-t-md px-3 py-1.5 text-xs font-medium ${subTab === id ? "border border-b-0 border-slate-200 bg-white text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>{label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!result && !loading && <p className="text-sm text-slate-400">「校正」を実行すると結果が表示されます。</p>}
          {loading && <p className="text-sm text-slate-400">Claude が原稿を分析しています...</p>}
          {result && subTab === "diff" && <DiffView sourceText={text} corrections={result.corrections} reasonLanguage={reasonLanguage} onStatusChange={(id, status) => setCorrectionStatus(mode, id, status)} />}
          {result && subTab === "list" && <CorrectionsList corrections={result.corrections} reasonLanguage={reasonLanguage} onStatusChange={(id, status) => setCorrectionStatus(mode, id, status)} />}
          {result && subTab === "consistency" && <ConsistencyPanel issues={result.consistencyIssues} />}
        </div>
        {result && <div className="border-t border-slate-200 p-3"><ExportButtons text={finalText} filenameBase={mode === "body" ? "revised-manuscript" : "revised-captions"} /></div>}
      </div>
    </div>
  );
}
