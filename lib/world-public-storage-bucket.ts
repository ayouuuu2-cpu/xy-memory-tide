/**
 * Bucket name for **browser** Storage uploads (must be `NEXT_PUBLIC_*` so it is in the client bundle).
 * Falls back to `memory-fragments` to match `lib/gallery-server-constants.ts`.
 */
export function getWorldPublicStorageBucket(): string {
  if (typeof process === "undefined") return "memory-fragments";
  return process.env.NEXT_PUBLIC_STORAGE_BUCKET?.trim() || "memory-fragments";
}
