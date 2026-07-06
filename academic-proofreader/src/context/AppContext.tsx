"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addCloudReference,
  addCloudWhitelistTerm,
  appendCloudVersion,
  createDocumentFromLocal,
  fetchCloudReferences,
  fetchCloudVersions,
  fetchLatestDocument,
  removeCloudReference,
  removeCloudWhitelistTerm,
  saveDocument,
  syncWhitelist,
} from "@/lib/repo/cloudSync";
import { getWhitelistPreset } from "@/lib/whitelistPresets";
import { generateId } from "@/lib/id";
import { getJournalProfile } from "@/lib/journalProfiles";
import { dedupeKey, type CslItem } from "@/lib/references/csl";
import { formatInTextCitation, orderReferencesForBibliography, formatReferenceEntry } from "@/lib/references/formatters";
import {
  loadCitationOrder,
  loadComments,
  loadDraft,
  loadReferences,
  loadSettings,
  loadVersions,
  loadWhitelist,
  saveCitationOrder,
  saveComments,
  saveDraft,
  saveReferences,
  saveSettings,
  saveVersions,
  saveWhitelist,
} from "@/lib/storage";
import type {
  CommentItem,
  Correction,
  CorrectionStatus,
  LibraryReference,
  ProofreadMode,
  ProofreadResult,
  RawProofreadResult,
  ReasonLanguage,
  ReferenceSource,
  VersionSnapshot,
  WhitelistTerm,
} from "@/lib/types";
import type { ReferenceCheckResponse } from "@/types/api";

export type TabId = "draft" | "body" | "caption" | "references" | "reviewer";

export type CloudSyncState = "off" | "syncing" | "synced" | "error";

function toProofreadResult(raw: RawProofreadResult): ProofreadResult {
  return {
    corrections: raw.corrections.map((c): Correction => ({
      id: generateId("corr"),
      original: c.original,
      revised: c.revised,
      reason: c.reason,
      reasonJa: c.reasonJa ?? "",
      category: c.category,
      status: "pending",
    })),
    revisedFullText: raw.revisedFullText,
    wordCount: raw.wordCount,
    consistencyIssues: raw.consistencyIssues.map((ci) => ({ id: generateId("ci"), ...ci })),
  };
}

interface AppContextValue {
  // settings
  journalId: string;
  setJournalId: (id: string) => void;
  stylePresetId: string;
  setStylePresetId: (id: string) => void;
  reasonLanguage: ReasonLanguage;
  setReasonLanguage: (lang: ReasonLanguage) => void;

  // whitelist
  whitelist: WhitelistTerm[];
  addWhitelistTerm: (term: string) => void;
  removeWhitelistTerm: (id: string) => void;
  applyWhitelistPreset: (presetId: string) => void;

  // tabs
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // body
  mainText: string;
  setMainText: (text: string) => void;
  mainResult: ProofreadResult | null;
  loadingMain: boolean;
  errorMain: string | null;
  runProofread: (mode: ProofreadMode) => Promise<void>;
  setCorrectionStatus: (mode: ProofreadMode, id: string, status: CorrectionStatus) => void;
  acceptAll: (mode: ProofreadMode) => void;
  rejectAll: (mode: ProofreadMode) => void;

  // Drafting-tab helpers: insert text at the cursor / replace the current
  // selection in the main body editor (used by Outline/Phrasebank/Paraphrase).
  mainTextareaRef: RefObject<HTMLTextAreaElement | null>;
  getMainSelectionRange: () => { start: number; end: number } | null;
  getMainSelectedText: () => string;
  replaceMainRange: (range: { start: number; end: number }, text: string) => void;
  insertIntoMainText: (text: string) => void;

  // caption
  captionText: string;
  setCaptionText: (text: string) => void;
  captionResult: ProofreadResult | null;
  loadingCaption: boolean;
  errorCaption: string | null;

  // reviewer response
  reviewerCommentsText: string;
  setReviewerCommentsText: (text: string) => void;
  reviewerResponse: string;
  loadingReviewerResponse: boolean;
  errorReviewerResponse: string | null;
  generateReviewerResponse: () => Promise<void>;

  // cover letter
  coverLetter: string;
  loadingCoverLetter: boolean;
  errorCoverLetter: string | null;
  generateCoverLetter: (title: string, authorNotes: string) => Promise<void>;

  // cloud sync (Phase 0)
  cloudSyncState: CloudSyncState;
  cloudSyncError: string | null;

  // version history
  versions: VersionSnapshot[];

  // comments
  comments: CommentItem[];
  addComment: (input: { targetType: "correction" | "global"; targetId?: string; targetLabel?: string; text: string }) => void;
  removeComment: (id: string) => void;

  // references (Phase 2)
  references: LibraryReference[];
  /** Adds references (deduped by DOI/title+year). Returns one LibraryReference per input item — the new entry, or the pre-existing match. */
  addReferences: (items: { csl: CslItem; source: ReferenceSource }[]) => LibraryReference[];
  removeReference: (id: string) => void;
  citationOrder: string[];
  /** Builds the in-text marker for the current journal's citation style, records citation order, and inserts it at the cursor. */
  citeReference: (ref: LibraryReference) => void;
  bibliography: { reference: LibraryReference; entry: string }[];
  runReferenceCheck: () => Promise<void>;
  referenceCheckResult: ReferenceCheckResponse | null;
  loadingReferenceCheck: boolean;
  errorReferenceCheck: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

// This provider is only ever mounted client-side (see ClientApp, loaded via
// next/dynamic with ssr:false), so it is safe to read localStorage directly
// in lazy useState initializers — there is no server-rendered output to
// mismatch against, and it avoids the "setState in effect" anti-pattern for
// what is really just synchronous initialization from an external store.
export function AppProvider({ children }: { children: ReactNode }) {
  const { supabase, userId, accessToken } = useAuth();

  const [journalId, setJournalId] = useState(() => loadSettings().journalId);
  const [stylePresetId, setStylePresetId] = useState(() => loadSettings().stylePresetId);
  const [reasonLanguage, setReasonLanguage] = useState<ReasonLanguage>(() => loadSettings().reasonLanguage);

  const [whitelist, setWhitelist] = useState<WhitelistTerm[]>(() => loadWhitelist());

  const [activeTab, setActiveTab] = useState<TabId>("draft");

  const [mainText, setMainText] = useState(() => loadDraft().mainText);
  const [captionText, setCaptionText] = useState(() => loadDraft().captionText);
  const [reviewerCommentsText, setReviewerCommentsText] = useState(() => loadDraft().reviewerCommentsText);

  // Drafting-tab helpers: the body textarea registers itself here so that
  // outline/phrasebank/paraphrase features can insert text at the cursor (or
  // replace the current selection) even after focus has moved elsewhere.
  // selectionStart/End persist on the DOM node across blur, so we read them
  // live from the ref rather than mirroring them into React state.
  const mainTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mainResult, setMainResult] = useState<ProofreadResult | null>(null);
  const [captionResult, setCaptionResult] = useState<ProofreadResult | null>(null);
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [errorMain, setErrorMain] = useState<string | null>(null);
  const [errorCaption, setErrorCaption] = useState<string | null>(null);

  const [reviewerResponse, setReviewerResponse] = useState("");
  const [loadingReviewerResponse, setLoadingReviewerResponse] = useState(false);
  const [errorReviewerResponse, setErrorReviewerResponse] = useState<string | null>(null);

  const [coverLetter, setCoverLetter] = useState("");
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [errorCoverLetter, setErrorCoverLetter] = useState<string | null>(null);

  const [versions, setVersions] = useState<VersionSnapshot[]>(() => loadVersions());
  const [comments, setComments] = useState<CommentItem[]>(() => loadComments());

  const [references, setReferences] = useState<LibraryReference[]>(() => loadReferences());
  const [citationOrder, setCitationOrder] = useState<string[]>(() => loadCitationOrder());
  const [referenceCheckResult, setReferenceCheckResult] = useState<ReferenceCheckResponse | null>(null);
  const [loadingReferenceCheck, setLoadingReferenceCheck] = useState(false);
  const [errorReferenceCheck, setErrorReferenceCheck] = useState<string | null>(null);

  // Debounced autosave of the draft text fields (writes to localStorage; does
  // not call any React state setter, so it's a plain external-system effect).
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDraft({ mainText, captionText, reviewerCommentsText, updatedAt: Date.now() });
    }, 500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [mainText, captionText, reviewerCommentsText]);

  useEffect(() => {
    saveSettings({ journalId, stylePresetId, reasonLanguage });
  }, [journalId, stylePresetId, reasonLanguage]);

  useEffect(() => {
    saveWhitelist(whitelist);
  }, [whitelist]);

  useEffect(() => {
    saveComments(comments);
  }, [comments]);

  useEffect(() => {
    saveReferences(references);
  }, [references]);

  useEffect(() => {
    saveCitationOrder(citationOrder);
  }, [citationOrder]);

  // ---- Cloud sync (Phase 0) -------------------------------------------------
  // localStorage stays the offline cache / source for anonymous use; when a
  // user signs in we run an initial sync (cloud wins if a document exists,
  // otherwise the local draft is migrated up), then mirror subsequent changes.
  const [cloudDocumentId, setCloudDocumentId] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>("off");
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!supabase || !userId) {
        setCloudDocumentId(null);
        setCloudSyncState("off");
        setCloudSyncError(null);
        return;
      }
      setCloudSyncState("syncing");
      // Read the freshest local data from storage (kept current by the
      // debounced autosave effects) so login migrates what the user sees.
      const localDraft = loadDraft();
      const localSettings = loadSettings();
      const localWhitelist = loadWhitelist();
      const localReferences = loadReferences();

      let doc = await fetchLatestDocument(supabase, userId);
      if (!doc) {
        doc = await createDocumentFromLocal(supabase, userId, localDraft, localSettings);
      } else {
        // Cloud copy wins: replace local editing state.
        setMainText(doc.draft.mainText);
        setCaptionText(doc.draft.captionText);
        setReviewerCommentsText(doc.draft.reviewerCommentsText);
        setJournalId(doc.settings.journalId);
        setStylePresetId(doc.settings.stylePresetId);
      }
      if (cancelled) return;
      setCloudDocumentId(doc.id);

      const [cloudTerms, cloudVersions] = await Promise.all([
        syncWhitelist(supabase, userId, localWhitelist),
        fetchCloudVersions(supabase, doc.id),
      ]);
      if (cancelled) return;
      setWhitelist(cloudTerms);
      if (cloudVersions.length > 0) {
        setVersions(cloudVersions);
        saveVersions(cloudVersions);
      }

      // References: cloud wins for anything already synced; any local-only
      // reference (never signed in before, or added while offline) is pushed
      // up once, then adopted with its DB-assigned id.
      const cloudReferences = await fetchCloudReferences(supabase, userId);
      if (cancelled) return;
      const cloudKeys = new Set(cloudReferences.map((r) => dedupeKey(r.csl)));
      const localOnly = localReferences.filter((r) => !cloudKeys.has(dedupeKey(r.csl)));
      const pushed = await Promise.all(
        localOnly.map((r) => addCloudReference(supabase, userId, r.csl, r.source).catch(() => null))
      );
      if (cancelled) return;
      setReferences([...cloudReferences, ...pushed.filter((r): r is LibraryReference => !!r)]);

      setCloudSyncState("synced");
      setCloudSyncError(null);
    }
    run().catch((err) => {
      if (!cancelled) {
        setCloudSyncState("error");
        setCloudSyncError(err instanceof Error ? err.message : String(err));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  // Debounced mirror of draft + settings to the cloud document.
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!supabase || !userId || !cloudDocumentId) return;
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(() => {
      saveDocument(
        supabase,
        cloudDocumentId,
        { mainText, captionText, reviewerCommentsText, updatedAt: Date.now() },
        { journalId, stylePresetId, reasonLanguage }
      )
        .then(() => {
          setCloudSyncState("synced");
          setCloudSyncError(null);
        })
        .catch((err) => {
          setCloudSyncState("error");
          setCloudSyncError(err instanceof Error ? err.message : String(err));
        });
    }, 1500);
    return () => {
      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    };
  }, [supabase, userId, cloudDocumentId, mainText, captionText, reviewerCommentsText, journalId, stylePresetId, reasonLanguage]);
  // ---------------------------------------------------------------------------

  const addWhitelistTerm = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setWhitelist((prev) => {
        if (prev.some((t) => t.term.toLowerCase() === trimmed.toLowerCase())) return prev;
        return [...prev, { id: generateId("wl"), term: trimmed }];
      });
      if (supabase && userId) {
        addCloudWhitelistTerm(supabase, userId, trimmed).catch(() => {});
      }
    },
    [supabase, userId]
  );

  const removeWhitelistTerm = useCallback(
    (id: string) => {
      const target = whitelist.find((t) => t.id === id);
      setWhitelist((prev) => prev.filter((t) => t.id !== id));
      if (supabase && userId && target) {
        removeCloudWhitelistTerm(supabase, userId, target.term).catch(() => {});
      }
    },
    [supabase, userId, whitelist]
  );

  const applyWhitelistPreset = useCallback(
    (presetId: string) => {
      const preset = getWhitelistPreset(presetId);
      if (!preset) return;
      setWhitelist((prev) => {
        const existing = new Set(prev.map((t) => t.term.toLowerCase()));
        const additions = preset.terms
          .filter((term) => !existing.has(term.toLowerCase()))
          .map((term) => ({ id: generateId("wl"), term, presetId: preset.id }));
        return [...prev, ...additions];
      });
      if (supabase && userId) {
        for (const term of preset.terms) {
          addCloudWhitelistTerm(supabase, userId, term, preset.id).catch(() => {});
        }
      }
    },
    [supabase, userId]
  );

  const runProofread = useCallback(
    async (mode: ProofreadMode) => {
      const text = mode === "body" ? mainText : captionText;
      if (!text.trim()) return;

      const setLoading = mode === "body" ? setLoadingMain : setLoadingCaption;
      const setError = mode === "body" ? setErrorMain : setErrorCaption;
      const setResult = mode === "body" ? setMainResult : setCaptionResult;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/proofread", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            text,
            mode,
            journalId,
            stylePresetId,
            whitelist: whitelist.map((w) => w.term),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Proofreading request failed.");
        }
        const result = toProofreadResult(data as RawProofreadResult);
        setResult(result);

        const snapshot: VersionSnapshot = {
          id: generateId("ver"),
          timestamp: Date.now(),
          label: new Date().toLocaleString(),
          mode,
          journalId,
          stylePresetId,
          originalText: text,
          revisedText: result.revisedFullText,
          corrections: result.corrections,
          consistencyIssues: result.consistencyIssues,
        };
        setVersions((prev) => {
          const next = [snapshot, ...prev].slice(0, 50);
          saveVersions(next);
          return next;
        });
        if (supabase && userId && cloudDocumentId) {
          appendCloudVersion(supabase, userId, cloudDocumentId, snapshot).catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
      }
    },
    [mainText, captionText, journalId, stylePresetId, whitelist, accessToken, supabase, userId, cloudDocumentId]
  );

  const setCorrectionStatus = useCallback(
    (mode: ProofreadMode, id: string, status: CorrectionStatus) => {
      const setResult = mode === "body" ? setMainResult : setCaptionResult;
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          corrections: prev.corrections.map((c) => (c.id === id ? { ...c, status } : c)),
        };
      });
    },
    []
  );

  const acceptAll = useCallback((mode: ProofreadMode) => {
    const setResult = mode === "body" ? setMainResult : setCaptionResult;
    setResult((prev) =>
      prev ? { ...prev, corrections: prev.corrections.map((c) => ({ ...c, status: "accepted" as const })) } : prev
    );
  }, []);

  const rejectAll = useCallback((mode: ProofreadMode) => {
    const setResult = mode === "body" ? setMainResult : setCaptionResult;
    setResult((prev) =>
      prev ? { ...prev, corrections: prev.corrections.map((c) => ({ ...c, status: "rejected" as const })) } : prev
    );
  }, []);

  const getMainSelectionRange = useCallback(() => {
    const el = mainTextareaRef.current;
    if (!el) return null;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    return start === end ? null : { start, end };
  }, []);

  const getMainSelectedText = useCallback(() => {
    const el = mainTextareaRef.current;
    if (!el) return "";
    return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
  }, []);

  /** Replaces an explicit [start, end) range captured earlier (e.g. by getMainSelectionRange). */
  const replaceMainRange = useCallback((range: { start: number; end: number }, text: string) => {
    setMainText((prev) => prev.slice(0, range.start) + text + prev.slice(range.end));
  }, []);

  /** Inserts at the cursor, or replaces the current selection if any (both are the same splice operation). */
  const insertIntoMainText = useCallback((text: string) => {
    const el = mainTextareaRef.current;
    if (!el) {
      setMainText((prev) => prev + (prev && !prev.endsWith("\n") ? "\n" : "") + text);
      return;
    }
    const start = Math.min(el.selectionStart ?? el.value.length, el.value.length);
    const end = Math.min(el.selectionEnd ?? el.value.length, el.value.length);
    // Avoid gluing onto the previous character with no separator (e.g. a
    // phrasebank phrase inserted right after a sentence with no trailing space).
    const before = el.value.slice(0, start);
    const needsSeparator = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text);
    const insertion = needsSeparator ? ` ${text}` : text;
    setMainText((prev) => prev.slice(0, start) + insertion + prev.slice(end));
    requestAnimationFrame(() => {
      const pos = start + insertion.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }, []);

  const generateCoverLetter = useCallback(
    async (title: string, authorNotes: string) => {
      const text = mainResult?.revisedFullText || mainText;
      if (!text.trim()) return;
      setLoadingCoverLetter(true);
      setErrorCoverLetter(null);
      try {
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ revisedText: text, journalId, title, authorNotes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cover letter generation failed.");
        setCoverLetter(data.letter);
      } catch (err) {
        setErrorCoverLetter(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoadingCoverLetter(false);
      }
    },
    [mainResult, mainText, journalId, accessToken]
  );

  const generateReviewerResponse = useCallback(async () => {
    if (!reviewerCommentsText.trim()) return;
    setLoadingReviewerResponse(true);
    setErrorReviewerResponse(null);
    try {
      const res = await fetch("/api/reviewer-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          reviewerComments: reviewerCommentsText,
          revisedText: mainResult?.revisedFullText || mainText,
          journalId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Response generation failed.");
      setReviewerResponse(data.response);
    } catch (err) {
      setErrorReviewerResponse(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoadingReviewerResponse(false);
    }
  }, [reviewerCommentsText, mainResult, mainText, journalId, accessToken]);

  const addComment = useCallback(
    (input: { targetType: "correction" | "global"; targetId?: string; targetLabel?: string; text: string }) => {
      if (!input.text.trim()) return;
      setComments((prev) => [
        {
          id: generateId("cmt"),
          targetType: input.targetType,
          targetId: input.targetId,
          targetLabel: input.targetLabel,
          text: input.text.trim(),
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    },
    []
  );

  const removeComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** Adds new references, skipping ones already in the library (by DOI, else normalized title+year). Returns how many were actually added. */
  const addReferences = useCallback(
    (items: { csl: CslItem; source: ReferenceSource }[]) => {
      // Compute against the current `references` directly rather than inside
      // the setState updater: addCloudReference is a side effect (network
      // call), and updater functions must stay pure or React's dev-mode
      // double-invocation check will fire it twice.
      const existingByKey = new Map(references.map((r) => [dedupeKey(r.csl), r]));
      const result: LibraryReference[] = [];
      const toAdd: LibraryReference[] = [];
      for (const { csl, source } of items) {
        const key = dedupeKey(csl);
        const existing = existingByKey.get(key);
        if (existing) {
          result.push(existing);
          continue;
        }
        const created: LibraryReference = { id: generateId("ref"), csl, source };
        existingByKey.set(key, created);
        toAdd.push(created);
        result.push(created);
      }

      if (toAdd.length > 0) {
        setReferences((prev) => [...prev, ...toAdd]);
        if (supabase && userId) {
          toAdd.forEach((r) => {
            addCloudReference(supabase, userId, r.csl, r.source)
              .then((cloudRow) => {
                setReferences((cur) => cur.map((c) => (c.id === r.id ? cloudRow : c)));
                setCitationOrder((cur) => cur.map((id) => (id === r.id ? cloudRow.id : id)));
              })
              .catch(() => {});
          });
        }
      }
      return result;
    },
    [references, supabase, userId]
  );

  const removeReference = useCallback(
    (id: string) => {
      setReferences((prev) => prev.filter((r) => r.id !== id));
      setCitationOrder((prev) => prev.filter((refId) => refId !== id));
      if (supabase && userId) {
        removeCloudReference(supabase, id).catch(() => {});
      }
    },
    [supabase, userId]
  );

  const citeReference = useCallback(
    (ref: LibraryReference) => {
      // Compute against the current value directly (not inside the setState
      // updater) since insertIntoMainText is a side effect — updater functions
      // must stay pure or React's dev-mode double-invocation check will run
      // the side effect twice.
      const existingIndex = citationOrder.indexOf(ref.id);
      const number = existingIndex === -1 ? citationOrder.length + 1 : existingIndex + 1;
      if (existingIndex === -1) {
        setCitationOrder((prev) => (prev.includes(ref.id) ? prev : [...prev, ref.id]));
      }
      const journal = getJournalProfile(journalId);
      const { citationStyleId, etAlMax } = journal.referenceStyle;
      insertIntoMainText(formatInTextCitation(ref.csl, citationStyleId, etAlMax, number));
    },
    [journalId, citationOrder, insertIntoMainText]
  );

  const bibliography = useMemo(() => {
    const journal = getJournalProfile(journalId);
    const { citationStyleId, etAlMax } = journal.referenceStyle;
    const ordered = orderReferencesForBibliography(
      references.map((r) => ({ id: r.id, item: r.csl })),
      citationStyleId,
      citationOrder
    );
    const byId = new Map(references.map((r) => [r.id, r]));
    return ordered
      .map((o, i) => {
        const reference = byId.get(o.id);
        if (!reference) return null;
        const number = citationStyleId === "apa" ? undefined : i + 1;
        return { reference, entry: formatReferenceEntry(o.item, citationStyleId, etAlMax, number) };
      })
      .filter((x): x is { reference: LibraryReference; entry: string } => !!x);
  }, [references, citationOrder, journalId]);

  const runReferenceCheck = useCallback(async () => {
    if (!mainText.trim()) return;
    setLoadingReferenceCheck(true);
    setErrorReferenceCheck(null);
    try {
      const res = await fetch("/api/references/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: mainText,
          references: references.map((r) => ({
            id: r.id,
            title: r.csl.title ?? "",
            authorsText: (r.csl.author ?? []).map((a) => a.literal || [a.given, a.family].filter(Boolean).join(" ")).join(", "),
            year: r.csl.issued?.["date-parts"]?.[0]?.[0] ?? null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reference check failed.");
      setReferenceCheckResult(data as ReferenceCheckResponse);
    } catch (err) {
      setErrorReferenceCheck(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoadingReferenceCheck(false);
    }
  }, [mainText, references]);

  const value = useMemo<AppContextValue>(
    () => ({
      journalId,
      setJournalId,
      stylePresetId,
      setStylePresetId,
      reasonLanguage,
      setReasonLanguage,
      whitelist,
      addWhitelistTerm,
      removeWhitelistTerm,
      applyWhitelistPreset,
      activeTab,
      setActiveTab,
      mainText,
      setMainText,
      mainResult,
      loadingMain,
      errorMain,
      runProofread,
      setCorrectionStatus,
      acceptAll,
      rejectAll,
      mainTextareaRef,
      getMainSelectionRange,
      getMainSelectedText,
      replaceMainRange,
      insertIntoMainText,
      captionText,
      setCaptionText,
      captionResult,
      loadingCaption,
      errorCaption,
      reviewerCommentsText,
      setReviewerCommentsText,
      reviewerResponse,
      loadingReviewerResponse,
      errorReviewerResponse,
      generateReviewerResponse,
      coverLetter,
      loadingCoverLetter,
      errorCoverLetter,
      generateCoverLetter,
      cloudSyncState,
      cloudSyncError,
      versions,
      comments,
      addComment,
      removeComment,
      references,
      addReferences,
      removeReference,
      citationOrder,
      citeReference,
      bibliography,
      runReferenceCheck,
      referenceCheckResult,
      loadingReferenceCheck,
      errorReferenceCheck,
    }),
    [
      journalId,
      stylePresetId,
      reasonLanguage,
      whitelist,
      addWhitelistTerm,
      removeWhitelistTerm,
      applyWhitelistPreset,
      activeTab,
      mainText,
      mainResult,
      loadingMain,
      errorMain,
      runProofread,
      setCorrectionStatus,
      acceptAll,
      rejectAll,
      mainTextareaRef,
      getMainSelectionRange,
      getMainSelectedText,
      replaceMainRange,
      insertIntoMainText,
      captionText,
      captionResult,
      loadingCaption,
      errorCaption,
      reviewerCommentsText,
      reviewerResponse,
      loadingReviewerResponse,
      errorReviewerResponse,
      generateReviewerResponse,
      coverLetter,
      loadingCoverLetter,
      errorCoverLetter,
      generateCoverLetter,
      cloudSyncState,
      cloudSyncError,
      versions,
      comments,
      addComment,
      removeComment,
      references,
      addReferences,
      removeReference,
      citationOrder,
      citeReference,
      bibliography,
      runReferenceCheck,
      referenceCheckResult,
      loadingReferenceCheck,
      errorReferenceCheck,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider.");
  return ctx;
}
