// Typed access to environment configuration. Every feature must keep working
// (in a degraded "local mode") when its env vars are absent, so all checks
// are boolean helpers rather than throwing getters.
//
// Server-only secrets (GEMINI_API_KEY) must never be read from client
// components; the NEXT_PUBLIC_* Supabase values are RLS-protected publishable
// keys and are safe to expose.

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Safe on both server and client (NEXT_PUBLIC_* is inlined at build time). */
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
