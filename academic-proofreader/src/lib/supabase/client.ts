// Browser-side Supabase client. Returns null when the project isn't
// configured, in which case the app runs in "local mode" (localStorage only).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/config/env";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const config = getSupabaseConfig();
  browserClient = config ? createClient(config.url, config.anonKey) : null;
  return browserClient;
}

export function isCloudEnabled(): boolean {
  return getSupabaseConfig() !== null;
}
