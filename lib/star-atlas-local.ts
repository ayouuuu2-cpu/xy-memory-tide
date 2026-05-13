import type { GlobeMarkerKind } from "@/components/globe/types";
import { latLngToPixel } from "@/lib/geo-sphere";

export const STAR_ATLAS_LS_KEY = "memory-tide-star-atlas-v1";

export type StarAtlasEntry = {
  id: string;
  lat: number;
  lng: number;
  kind: GlobeMarkerKind;
  recordedDate: string;
  label: string;
  /** 与 {@link latLngToPixel} 对齐的展开图归一化坐标 */
  mapUv: { x: number; y: number };
};

export function toStarAtlasEntry(
  id: string,
  lat: number,
  lng: number,
  kind: GlobeMarkerKind,
  recordedDate: string,
  label: string,
): StarAtlasEntry {
  return { id, lat, lng, kind, recordedDate, label, mapUv: latLngToPixel(lat, lng) };
}

type Stored = { v: 1; updatedAt: number; entries: StarAtlasEntry[] };

export function persistStarAtlas(entries: StarAtlasEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Stored = { v: 1, updatedAt: Date.now(), entries };
    localStorage.setItem(STAR_ATLAS_LS_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
