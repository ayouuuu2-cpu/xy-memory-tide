/** Default cap when env is unset (200+ per product request). */
export const DEFAULT_MAX_GALLERY_ITEMS = 256;

const HARD_CAP = 10_000;

function parseCap(raw: string | undefined): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_GALLERY_ITEMS;
  return Math.min(n, HARD_CAP);
}

/** Server (API routes): prefers `MAX_GALLERY_ITEMS`, then `NEXT_PUBLIC_MAX_GALLERY_ITEMS`. */
export function maxGalleryItemsServer(): number {
  return parseCap(process.env.MAX_GALLERY_ITEMS ?? process.env.NEXT_PUBLIC_MAX_GALLERY_ITEMS);
}

/** Client bundle: `NEXT_PUBLIC_MAX_GALLERY_ITEMS` baked at build time. */
export function maxGalleryItemsClient(): number {
  return parseCap(process.env.NEXT_PUBLIC_MAX_GALLERY_ITEMS);
}
