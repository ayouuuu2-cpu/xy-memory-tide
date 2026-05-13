import type { LandmarkMemory } from "@/data/memories";
import { YUNNAN_LANDMARK } from "@/data/memories";
import { CANONICAL_YUNNAN_NAME, canonicalYunnanPosition } from "@/lib/yunnan-anchor";

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function isLatLng(p: unknown): p is { lat: number; lng: number } {
  return (
    !!p &&
    typeof p === "object" &&
    "lat" in p &&
    "lng" in p &&
    typeof (p as { lat: unknown }).lat === "number" &&
    typeof (p as { lng: unknown }).lng === "number"
  );
}

function normalizePosition(
  stored: unknown,
  fallback: { lat: number; lng: number },
): { lat: number; lng: number } {
  if (isLatLng(stored)) return { lat: stored.lat, lng: stored.lng };
  return fallback;
}

/**
 * Always returns exactly one landmark: Yunnan.
 * Strips any stored extras (Tokyo, user-generated pins, etc.) per product rules.
 */
export function mergeLandmarkData(stored: LandmarkMemory[] | null): LandmarkMemory[] {
  const base = deepClone(YUNNAN_LANDMARK);
  if (!stored?.length) return [base];

  const saved = stored.find((s) => s.id === "yunnan");
  if (!saved) return [base];

  const rawPos = normalizePosition(saved.position, base.position);
  const merged: LandmarkMemory = {
    ...base,
    ...saved,
    id: "yunnan",
    name: CANONICAL_YUNNAN_NAME,
    position: canonicalYunnanPosition(rawPos.lat, rawPos.lng),
    images: Array.isArray(saved.images) ? saved.images : base.images,
    texts: Array.isArray(saved.texts) && saved.texts.length ? saved.texts : base.texts,
    tags: Array.isArray(saved.tags) ? saved.tags : base.tags,
  };
  return [merged];
}
