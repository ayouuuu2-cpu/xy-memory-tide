import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function supabaseProjectUrl(): string | undefined {
  const a = process.env.SUPABASE_URL?.trim();
  const b = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return a || b;
}

/** Server-only Supabase client with service role (bypasses RLS). */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = supabaseProjectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured (set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseProjectUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
