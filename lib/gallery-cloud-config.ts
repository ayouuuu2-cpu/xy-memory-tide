import { isSupabaseConfigured } from "@/lib/supabase/admin";

/**
 * Cloud gallery UI + API when either:
 * - New default: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cross-device reads in browser), or
 * - Legacy: `NEXT_PUBLIC_MEMORY_GALLERY_CLOUD=1` (writes still need service role on server).
 */
export function isCloudGalleryClient(): boolean {
  const hasPublicPair = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
  return hasPublicPair || process.env.NEXT_PUBLIC_MEMORY_GALLERY_CLOUD === "1";
}

/** Server routes: Supabase service role configured AND client cloud mode is on. */
export function isCloudGalleryServerEnabled(): boolean {
  return isSupabaseConfigured();
}
