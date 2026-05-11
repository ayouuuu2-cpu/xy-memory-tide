import { getMoonIllumination } from "suncalc";

export type CelestialBirthdayMode = "virgo" | "scorpio";

/** Local calendar: Sept 14 (Virgo) & Nov 12 (Scorpio). */
export function getCelestialBirthdayToday(): CelestialBirthdayMode | null {
  const t = new Date();
  const m = t.getMonth() + 1;
  const d = t.getDate();
  if (m === 9 && d === 14) return "virgo";
  if (m === 11 && d === 12) return "scorpio";
  return null;
}

/** Full-moon coronation: ~24h around exact full (phase ≈ 0.5, high illumination). */
export function isFullMoonCoronationWindow(at: Date = new Date()): boolean {
  const ill = getMoonIllumination(at);
  const offsetsH = [-14, -8, -4, 0, 4, 8, 14];
  let minDist = 1;
  for (const h of offsetsH) {
    const d = new Date(at.getTime() + h * 3_600_000);
    const i = getMoonIllumination(d);
    minDist = Math.min(minDist, Math.abs(i.phase - 0.5));
  }
  return ill.fraction >= 0.94 && minDist < 0.12;
}

export function getMoonSnapshot(at: Date = new Date()) {
  const ill = getMoonIllumination(at);
  return { fraction: ill.fraction, phase: ill.phase, angle: ill.angle };
}
