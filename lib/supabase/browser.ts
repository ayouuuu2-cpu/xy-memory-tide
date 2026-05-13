import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { looksLikePublishableSupabaseAnonKey, USE_LEGACY_JWT_ANON_HINT } from "@/lib/supabase/key-hints";

let browserClient: SupabaseClient | null = null;
let publishableAnonWarned = false;

/**
 * Browser-only singleton (anon key). Use for reads allowed by RLS (e.g. `photos` select).
 * Requires `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the client bundle.
 */
export function hasSupabaseBrowserConfig(): boolean {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser() must only run in the browser.");
  }
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (looksLikePublishableSupabaseAnonKey(anon) && !publishableAnonWarned) {
    publishableAnonWarned = true;
    console.warn(`[Supabase] ${USE_LEGACY_JWT_ANON_HINT}`);
  }
  browserClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}
