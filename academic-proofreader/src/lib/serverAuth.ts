// Resolves the Supabase user from an optional `Authorization: Bearer <token>`
// header on API routes. Auth is optional in Phase 0 — anonymous requests are
// allowed and simply rate-limited by IP instead of user id.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getSupabaseConfig } from "@/config/env";

export interface ServerAuthResult {
  userId: string | null;
}

export async function resolveUser(req: NextRequest): Promise<ServerAuthResult> {
  const config = getSupabaseConfig();
  const authHeader = req.headers.get("authorization");
  if (!config || !authHeader?.startsWith("Bearer ")) {
    return { userId: null };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const supabase = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { userId: null };
    return { userId: data.user.id };
  } catch {
    // Invalid/expired token → treat as anonymous rather than failing the call.
    return { userId: null };
  }
}
