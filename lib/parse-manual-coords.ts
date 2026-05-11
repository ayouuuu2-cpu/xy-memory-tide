/**
 * If the user types coordinates instead of a place name, return lat/lng.
 * Accepts: "48.8584, 2.2945" · "48.8584 2.2945" · optional Chinese comma.
 */
export function parseManualLatLng(raw: string): { lat: number; lng: number } | null {
  const q = raw.trim().replace(/，/g, ",");
  const comma = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(q);
  const spaced = /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(q);
  const m = comma ?? spaced;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
