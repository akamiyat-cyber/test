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
import type { ReactNode } from "react";
import { getWhitelistPreset } from "@/lib/whitelistPresets";
import { generateId } from "@/lib/id";
import {
  loadComments,
  loadDraft,
  loadSettings,
  loadVersions,
  loadWhitelist,
  saveComments,
  saveDraft,
  saveSettings,
  saveVersions,
  saveWhitelist,
} from "@/lib/storage";
import type {
  CommentItem,
  Correction,
  CorrectionStatus,
  ProofreadMode,
  ProofreadResult,
  RawProofreadResult,
  ReasonLanguage,
  VersionSnapshot,
  WhitelistTerm,
} from "@/lib/types";

export type TabId = "body" | "caption" | "reviewer";

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

  // version history
  versions: VersionSnapshot[];

  // comments
  comments: CommentItem[];
  addComment: (input: { targetType: "correction" | "global"; targetId?: string; targetLabel?: string; text: string }) => void;
  removeComment: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// This provider is only ever mounted client-side (see ClientApp, loaded via
// next/dynamic with ssr:false), so it is safe to read localStorage directly
// in lazy useState initializers — there is no server-rendered output to
// mismatch against, and it avoids the "setState in effect" anti-pattern for
// what is really just synchronous initialization from an external store.
export function AppProvider({ children }: { children: ReactNode }) {
  const [journalId, setJournalId] = useState(() => loadSettings().journalId);
  const [stylePresetId, setStylePresetId] = useState(() => loadSettings().stylePresetId);
  const [reasonLanguage, setReasonLanguage] = useState<ReasonLanguage>(() => loadSettings().reasonLanguage);

  const [whitelist, setWhitelist] = useState<WhitelistTerm[]>(() => loadWhitelist());

  const [activeTab, setActiveTab] = useState<TabId>("body");

  const [mainText, setMainText] = useState(() => loadDraft().mainText);
  const [captionText, setCaptionText] = useState(() => loadDraft().captionText);
  const [reviewerCommentsText, setReviewerCommentsText] = useState(() => loadDraft().reviewerCommentsText);

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

  const addWhitelistTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setWhitelist((prev) => {
      if (prev.some((t) => t.term.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { id: generateId("wl"), term: trimmed }];
    });
  }, []);

  const removeWhitelistTerm = useCallback((id: string) => {
    setWhitelist((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyWhitelistPreset = useCallback((presetId: string) => {
    const preset = getWhitelistPreset(presetId);
    if (!preset) return;
    setWhitelist((prev) => {
      const existing = new Set(prev.map((t) => t.term.toLowerCase()));
      const additions = preset.terms
        .filter((term) => !existing.has(term.toLowerCase()))
        .map((term) => ({ id: generateId("wl"), term, presetId: preset.id }));
      return [...prev, ...additions];
    });
  }, []);

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
          headers: { "Content-Type": "application/json" },
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
      }
    },
    [mainText, captionText, journalId, stylePresetId, whitelist]
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

  const generateCoverLetter = useCallback(
    async (title: string, authorNotes: string) => {
      const text = mainResult?.revisedFullText || mainText;
      if (!text.trim()) return;
      setLoadingCoverLetter(true);
      setErrorCoverLetter(null);
      try {
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    [mainResult, mainText, journalId]
  );

  const generateReviewerResponse = useCallback(async () => {
    if (!reviewerCommentsText.trim()) return;
    setLoadingReviewerResponse(true);
    setErrorReviewerResponse(null);
    try {
      const res = await fetch("/api/reviewer-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  }, [reviewerCommentsText, mainResult, mainText, journalId]);

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
      versions,
      comments,
      addComment,
      removeComment,
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
      versions,
      comments,
      addComment,
      removeComment,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider.");
  return ctx;
}
