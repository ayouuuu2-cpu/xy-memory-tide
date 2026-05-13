/**
 * Public site origin for outbound requests (e.g. Nominatim Referer) and absolute URLs.
 * Vercel sets `VERCEL_URL` (no scheme); prefer explicit `NEXT_PUBLIC_SITE_URL` in production.
 */
export function publicSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
