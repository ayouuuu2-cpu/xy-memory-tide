import { YUNNAN_LANDMARK } from "@/data/memories";

/**
 * 云南省大致范围（度）。库内若被误写成曼谷等坐标，一律回落到产品默认锚点。
 */
const YUNNAN_BOX = { south: 20.5, north: 29.65, west: 96.9, east: 106.45 };

export function isLikelyYunnanCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= YUNNAN_BOX.south &&
    lat <= YUNNAN_BOX.north &&
    lng >= YUNNAN_BOX.west &&
    lng <= YUNNAN_BOX.east
  );
}

/** 仅用于 id === yunnan：在省内则保留坐标，否则用内置默认点。 */
export function canonicalYunnanPosition(lat: number, lng: number): { lat: number; lng: number } {
  if (isLikelyYunnanCoords(lat, lng)) return { lat, lng };
  return { ...YUNNAN_LANDMARK.position };
}

export const CANONICAL_YUNNAN_NAME = "Yunnan";
