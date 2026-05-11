/**
 * Server-side geocoding: tries several free providers in order until one hits.
 * Avoids maintaining a growing list of per-city fallbacks.
 *
 * Order tuned for coverage + courtesy to Nominatim (OSM policy: prefer not to hammer it).
 * Province-level Chinese queries run Nominatim first with canonical strings to avoid wrong admin1.
 */

import { getCanonicalChinaProvinceSearch, repairMisassignedProvinceLabel } from "./china-geography-geocode";

export type GeocodeProvider = "open-meteo" | "photon" | "nominatim";

export type GeocodeHit = {
  lat: number;
  lng: number;
  displayName: string;
  provider: GeocodeProvider;
};

const TIMEOUT_MS = 10_000;
const UA = "XYMemoryTide/1.0 (personal memory diary; multi-provider geocode)";

function hasHanScript(q: string): boolean {
  try {
    return /\p{Script=Han}/u.test(q);
  } catch {
    return /[\u3400-\u9FFF]/.test(q);
  }
}

async function openMeteoSearch(q: string, language: "en" | "zh"): Promise<GeocodeHit | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=${language}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{
      name?: string;
      latitude?: number;
      longitude?: number;
      country?: string;
      admin1?: string;
    }>;
  };
  const r = data.results?.[0];
  if (!r || typeof r.latitude !== "number" || typeof r.longitude !== "number") return null;
  if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return null;
  const parts = [r.name, r.admin1, r.country].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return {
    lat: r.latitude,
    lng: r.longitude,
    displayName: parts.length ? parts.join(", ") : (r.name ?? q),
    provider: "open-meteo",
  };
}

async function photonSearch(q: string): Promise<GeocodeHit | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { type?: string; coordinates?: [number, number] };
      properties?: Record<string, unknown>;
    }>;
  };
  const f = data.features?.[0];
  const coords = f?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const p = f.properties ?? {};
  const name = typeof p.name === "string" ? p.name : "";
  const country = typeof p.country === "string" ? p.country : "";
  const state = typeof p.state === "string" ? p.state : "";
  const parts = [name, state, country].filter(Boolean);
  return {
    lat,
    lng,
    displayName: parts.length ? parts.join(", ") : name || q,
    provider: "photon",
  };
}

async function nominatimSearch(q: string, emailSuffix: string): Promise<GeocodeHit | null> {
  const nominatimUrl =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1` + emailSuffix;

  const res = await fetch(nominatimUrl, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
      "User-Agent": `${UA} (Nominatim fair-use)`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 429 || !res.ok) return null;

  const body = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const row = body[0];
  if (!row?.lat || !row?.lon) return null;

  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    displayName: row.display_name ?? q,
    provider: "nominatim",
  };
}

function withRepairedChinaLabel(hit: GeocodeHit): GeocodeHit {
  return {
    ...hit,
    displayName: repairMisassignedProvinceLabel(hit.displayName, hit.lat, hit.lng),
  };
}

/**
 * Resolve a free-text place query. Runs providers sequentially; stops on first hit.
 */
export async function resolveGeocodeQuery(q: string, nominatimEmailSuffix: string): Promise<GeocodeHit | null> {
  const canonicalProvince = getCanonicalChinaProvinceSearch(q);

  const attempts: Array<() => Promise<GeocodeHit | null>> = [];

  if (canonicalProvince) {
    attempts.push(() => nominatimSearch(canonicalProvince, nominatimEmailSuffix));
  }

  attempts.push(
    () => openMeteoSearch(q, "en"),
    () => openMeteoSearch(q, "zh"),
    () => photonSearch(q),
    () => nominatimSearch(q, nominatimEmailSuffix),
  );

  if (hasHanScript(q)) {
    attempts.push(
      () => nominatimSearch(`${q}, China`, nominatimEmailSuffix),
      () => nominatimSearch(`${q}, 中国`, nominatimEmailSuffix),
    );
  }

  for (const run of attempts) {
    try {
      const hit = await run();
      if (hit) return withRepairedChinaLabel(hit);
    } catch {
      /* try next provider */
    }
  }

  return null;
}
