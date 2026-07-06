// Cloud persistence layer (Phase 0). All functions take the authenticated
// user's id and read/write through supabase-js + RLS directly from the
// browser. localStorage (lib/storage.ts) remains the offline cache: the app
// always writes locally first, then mirrors to the cloud when signed in.
//
// Sync strategy (deliberately simple for Phase 0):
// - On sign-in: fetch the most recently updated document. If none exists,
//   create one seeded from the current local draft (migrating pre-cloud data).
//   If one exists, the cloud copy wins and replaces the local draft.
// - While signed in: debounced upserts mirror draft/settings changes; each
//   proofread run also appends a document_versions row; whitelist terms are
//   merged by term text.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRow, DocumentVersionRow, ReferenceRow, WhitelistTermRow } from "@/types/db";
import type { DraftState, LibraryReference, ReferenceSource, SettingsState, VersionSnapshot, WhitelistTerm } from "@/lib/types";
import type { CslItem } from "@/lib/references/csl";
import { cslAuthorsText, cslYear } from "@/lib/references/csl";

export interface CloudDocument {
  id: string;
  title: string;
  draft: DraftState;
  settings: Pick<SettingsState, "journalId" | "stylePresetId">;
}

function rowToCloudDocument(row: DocumentRow): CloudDocument {
  return {
    id: row.id,
    title: row.title,
    draft: {
      mainText: row.body_text,
      captionText: row.caption_text,
      reviewerCommentsText: row.reviewer_comments_text,
      updatedAt: Date.parse(row.updated_at) || Date.now(),
    },
    settings: { journalId: row.journal_id, stylePresetId: row.style_preset_id },
  };
}

/** Most recent document, or null if the user has none yet. */
export async function fetchLatestDocument(
  supabase: SupabaseClient,
  userId: string
): Promise<CloudDocument | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`documents fetch failed: ${error.message}`);
  const row = (data as DocumentRow[] | null)?.[0];
  return row ? rowToCloudDocument(row) : null;
}

export async function createDocumentFromLocal(
  supabase: SupabaseClient,
  userId: string,
  draft: DraftState,
  settings: SettingsState
): Promise<CloudDocument> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      title: "My manuscript",
      journal_id: settings.journalId,
      style_preset_id: settings.stylePresetId,
      body_text: draft.mainText,
      caption_text: draft.captionText,
      reviewer_comments_text: draft.reviewerCommentsText,
    })
    .select()
    .single();
  if (error) throw new Error(`document create failed: ${error.message}`);
  return rowToCloudDocument(data as DocumentRow);
}

export async function saveDocument(
  supabase: SupabaseClient,
  documentId: string,
  draft: DraftState,
  settings: SettingsState
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({
      journal_id: settings.journalId,
      style_preset_id: settings.stylePresetId,
      body_text: draft.mainText,
      caption_text: draft.captionText,
      reviewer_comments_text: draft.reviewerCommentsText,
    })
    .eq("id", documentId);
  if (error) throw new Error(`document save failed: ${error.message}`);
}

export async function appendCloudVersion(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  snapshot: VersionSnapshot
): Promise<void> {
  const { error } = await supabase.from("document_versions").insert({
    document_id: documentId,
    user_id: userId,
    mode: snapshot.mode,
    original_text: snapshot.originalText,
    revised_text: snapshot.revisedText,
    corrections: snapshot.corrections,
    consistency_issues: snapshot.consistencyIssues,
    journal_id: snapshot.journalId,
    style_preset_id: snapshot.stylePresetId,
  });
  if (error) throw new Error(`version insert failed: ${error.message}`);
}

export async function fetchCloudVersions(
  supabase: SupabaseClient,
  documentId: string,
  limit = 50
): Promise<VersionSnapshot[]> {
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`versions fetch failed: ${error.message}`);
  return ((data as DocumentVersionRow[]) ?? []).map((row) => ({
    id: row.id,
    timestamp: Date.parse(row.created_at) || 0,
    label: new Date(row.created_at).toLocaleString(),
    mode: row.mode,
    journalId: row.journal_id,
    stylePresetId: row.style_preset_id,
    originalText: row.original_text,
    revisedText: row.revised_text,
    corrections: row.corrections,
    consistencyIssues: row.consistency_issues,
  }));
}

/** Merges local whitelist into the cloud (by term text) and returns the union. */
export async function syncWhitelist(
  supabase: SupabaseClient,
  userId: string,
  localTerms: WhitelistTerm[]
): Promise<WhitelistTerm[]> {
  if (localTerms.length > 0) {
    const { error: upsertError } = await supabase.from("whitelist_terms").upsert(
      localTerms.map((t) => ({ user_id: userId, term: t.term, preset_id: t.presetId ?? null })),
      { onConflict: "user_id,term", ignoreDuplicates: true }
    );
    if (upsertError) throw new Error(`whitelist upsert failed: ${upsertError.message}`);
  }
  const { data, error } = await supabase
    .from("whitelist_terms")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`whitelist fetch failed: ${error.message}`);
  return ((data as WhitelistTermRow[]) ?? []).map((row) => ({
    id: row.id,
    term: row.term,
    presetId: row.preset_id ?? undefined,
  }));
}

export async function addCloudWhitelistTerm(
  supabase: SupabaseClient,
  userId: string,
  term: string,
  presetId?: string
): Promise<void> {
  const { error } = await supabase
    .from("whitelist_terms")
    .upsert([{ user_id: userId, term, preset_id: presetId ?? null }], {
      onConflict: "user_id,term",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(`whitelist add failed: ${error.message}`);
}

export async function removeCloudWhitelistTerm(
  supabase: SupabaseClient,
  userId: string,
  term: string
): Promise<void> {
  const { error } = await supabase
    .from("whitelist_terms")
    .delete()
    .eq("user_id", userId)
    .eq("term", term);
  if (error) throw new Error(`whitelist remove failed: ${error.message}`);
}

function rowToLibraryReference(row: ReferenceRow): LibraryReference {
  return { id: row.id, csl: row.csl as unknown as CslItem, source: row.source };
}

export async function fetchCloudReferences(supabase: SupabaseClient, userId: string): Promise<LibraryReference[]> {
  const { data, error } = await supabase
    .from("references")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`references fetch failed: ${error.message}`);
  return ((data as ReferenceRow[]) ?? []).map(rowToLibraryReference);
}

/** Inserts one reference and returns the DB-assigned row (its `id` replaces any client-side temp id). */
export async function addCloudReference(
  supabase: SupabaseClient,
  userId: string,
  csl: CslItem,
  source: ReferenceSource
): Promise<LibraryReference> {
  const { data, error } = await supabase
    .from("references")
    .insert({
      user_id: userId,
      csl,
      doi: csl.DOI ?? null,
      title: csl.title ?? null,
      authors_text: cslAuthorsText(csl) || null,
      year: cslYear(csl),
      source,
    })
    .select()
    .single();
  if (error) throw new Error(`reference insert failed: ${error.message}`);
  return rowToLibraryReference(data as ReferenceRow);
}

export async function removeCloudReference(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("references").delete().eq("id", id);
  if (error) throw new Error(`reference remove failed: ${error.message}`);
}
