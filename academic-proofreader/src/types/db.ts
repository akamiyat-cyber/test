// Row types mirroring supabase/migrations/0001_init.sql, 1:1 with the tables.
// Keep in sync with the migration when the schema evolves.

import type { ConsistencyIssue, Correction, ProofreadMode } from "@/lib/types";

export interface ProfileRow {
  id: string; // = auth.users.id
  display_name: string | null;
  plan: "free" | "pro";
  created_at: string;
  // Phase 5 (0002_billing.sql) — written only by the Stripe webhook (service role).
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  journal_id: string;
  style_preset_id: string;
  body_text: string;
  caption_text: string;
  reviewer_comments_text: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersionRow {
  id: string;
  document_id: string;
  user_id: string;
  mode: ProofreadMode;
  original_text: string;
  revised_text: string;
  corrections: Correction[];
  consistency_issues: ConsistencyIssue[];
  journal_id: string;
  style_preset_id: string;
  created_at: string;
}

export interface ReferenceRow {
  id: string;
  user_id: string;
  document_id: string | null;
  csl: Record<string, unknown>; // CSL-JSON item
  doi: string | null;
  title: string | null;
  authors_text: string | null;
  year: number | null;
  source: "bibtex" | "ris" | "crossref" | "semantic-scholar" | "pubmed" | "manual";
  created_at: string;
}

export interface CommentRow {
  id: string;
  user_id: string;
  document_id: string;
  target_type: "correction" | "global";
  target_label: string | null;
  body: string;
  created_at: string;
}

export interface WhitelistTermRow {
  id: string;
  user_id: string;
  term: string;
  preset_id: string | null;
  created_at: string;
}

export interface UsageEventRow {
  id: string;
  user_id: string | null;
  route: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}
