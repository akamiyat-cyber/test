// localStorage persistence layer. All reads/writes are guarded for SSR
// (Next.js renders this module on the server too) and wrapped in try/catch
// since localStorage can throw (private browsing, quota exceeded, etc.).
//
// Storage key layout:
//   academic-proofreader:draft      -> DraftState
//   academic-proofreader:settings   -> SettingsState
//   academic-proofreader:whitelist  -> WhitelistTerm[]
//   academic-proofreader:versions   -> VersionSnapshot[]
//   academic-proofreader:comments   -> CommentItem[]

import type {
  CommentItem,
  DraftState,
  SettingsState,
  VersionSnapshot,
  WhitelistTerm,
} from "./types";

const KEYS = {
  draft: "academic-proofreader:draft",
  settings: "academic-proofreader:settings",
  whitelist: "academic-proofreader:whitelist",
  versions: "academic-proofreader:versions",
  comments: "academic-proofreader:comments",
} as const;

const MAX_VERSIONS = 50;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/availability errors; data simply won't persist.
  }
}

export const defaultDraft: DraftState = {
  mainText: "",
  captionText: "",
  reviewerCommentsText: "",
  updatedAt: 0,
};

export const defaultSettings: SettingsState = {
  journalId: "general",
  stylePresetId: "general-academic",
  reasonLanguage: "en",
};

export function loadDraft(): DraftState {
  return readJSON(KEYS.draft, defaultDraft);
}

export function saveDraft(draft: DraftState): void {
  writeJSON(KEYS.draft, { ...draft, updatedAt: Date.now() });
}

export function loadSettings(): SettingsState {
  return readJSON(KEYS.settings, defaultSettings);
}

export function saveSettings(settings: SettingsState): void {
  writeJSON(KEYS.settings, settings);
}

export function loadWhitelist(): WhitelistTerm[] {
  return readJSON(KEYS.whitelist, []);
}

export function saveWhitelist(terms: WhitelistTerm[]): void {
  writeJSON(KEYS.whitelist, terms);
}

export function loadVersions(): VersionSnapshot[] {
  return readJSON(KEYS.versions, []);
}

export function saveVersions(versions: VersionSnapshot[]): void {
  writeJSON(KEYS.versions, versions.slice(0, MAX_VERSIONS));
}

export function appendVersion(snapshot: VersionSnapshot): VersionSnapshot[] {
  const versions = [snapshot, ...loadVersions()].slice(0, MAX_VERSIONS);
  saveVersions(versions);
  return versions;
}

export function loadComments(): CommentItem[] {
  return readJSON(KEYS.comments, []);
}

export function saveComments(comments: CommentItem[]): void {
  writeJSON(KEYS.comments, comments);
}
