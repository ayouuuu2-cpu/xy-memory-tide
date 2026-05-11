import type { CelestialBirthdayMode } from "@/lib/celestial";

/** Anchor date for "D+N" counter (ISO YYYY-MM-DD, local noon). */
const ANCHOR_KEY = "memory-tide-eternal-days-anchor";
const MILESTONES_KEY = "memory-tide-milestones";

export type Milestone = {
  id: string;
  title: string;
  /** 1–12 */
  anniversaryMonth: number;
  /** 1–31 */
  anniversaryDay: number;
  /** Time-locked whisper (data URL or remote). */
  voiceNoteUrl: string;
  createdAt: number;
};

function clampMonth(m: number): number {
  return Math.min(12, Math.max(1, Math.round(m)));
}

function clampDay(d: number): number {
  return Math.min(31, Math.max(1, Math.round(d)));
}

export function loadAnchorIso(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ANCHOR_KEY)?.trim();
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveAnchorIso(iso: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANCHOR_KEY, iso.slice(0, 10));
  } catch {
    /* ignore */
  }
}

/** Days since anchor (floored); 0 if no anchor. */
export function getDaysSinceAnchor(): number {
  const anchor = loadAnchorIso();
  if (!anchor) return 0;
  const a = new Date(`${anchor}T12:00:00`);
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  const diff = t.getTime() - a.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function ensureDefaultAnchor(): void {
  if (loadAnchorIso()) return;
  saveAnchorIso(new Date().toISOString().slice(0, 10));
}

function normalizeMilestone(row: Record<string, unknown>): Milestone | null {
  if (typeof row.id !== "string") return null;
  const month = clampMonth(Number(row.anniversaryMonth));
  const day = clampDay(Number(row.anniversaryDay));
  if (!month || !day) return null;
  return {
    id: row.id,
    title: typeof row.title === "string" ? row.title : "Milestone",
    anniversaryMonth: month,
    anniversaryDay: day,
    voiceNoteUrl: typeof row.voiceNoteUrl === "string" ? row.voiceNoteUrl : "",
    createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
  };
}

export function loadMilestones(): Milestone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MILESTONES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((r) => (typeof r === "object" && r !== null ? normalizeMilestone(r as Record<string, unknown>) : null))
      .filter((m): m is Milestone => m !== null);
  } catch {
    return [];
  }
}

export function saveMilestones(rows: Milestone[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function addMilestone(m: Omit<Milestone, "id" | "createdAt">): Milestone[] {
  const next: Milestone = {
    ...m,
    anniversaryMonth: clampMonth(m.anniversaryMonth),
    anniversaryDay: clampDay(m.anniversaryDay),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  const list = [next, ...loadMilestones()];
  saveMilestones(list);
  return list;
}

export function patchMilestone(id: string, patch: Partial<Pick<Milestone, "title" | "anniversaryMonth" | "anniversaryDay" | "voiceNoteUrl">>): Milestone[] {
  const list = loadMilestones().map((r) =>
    r.id === id
      ? {
          ...r,
          ...patch,
          anniversaryMonth: patch.anniversaryMonth != null ? clampMonth(patch.anniversaryMonth) : r.anniversaryMonth,
          anniversaryDay: patch.anniversaryDay != null ? clampDay(patch.anniversaryDay) : r.anniversaryDay,
        }
      : r,
  );
  saveMilestones(list);
  return list;
}

export function removeMilestone(id: string): Milestone[] {
  const list = loadMilestones().filter((r) => r.id !== id);
  saveMilestones(list);
  return list;
}

/** True if today's calendar matches (yearly recurrence). */
export function isAnniversaryToday(month: number, day: number): boolean {
  const t = new Date();
  return t.getMonth() + 1 === month && t.getDate() === day;
}

export function formatAnnualDate(month: number, day: number): string {
  try {
    return new Date(2024, month - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  } catch {
    return `${month}/${day}`;
  }
}

const BIRTHDAY_WHISPER_KEYS: Record<CelestialBirthdayMode, string> = {
  virgo: "memory-tide-birthday-whisper-virgo",
  scorpio: "memory-tide-birthday-whisper-scorpio",
};

/** Milestone on 9·14 / 11·12 with `voiceNoteUrl`, else optional `localStorage` data URL. */
export function findBirthdayWhisperUrl(which: CelestialBirthdayMode): string | null {
  const month = which === "virgo" ? 9 : 11;
  const day = which === "virgo" ? 14 : 12;
  const hit = loadMilestones().find((m) => m.anniversaryMonth === month && m.anniversaryDay === day && m.voiceNoteUrl.trim());
  if (hit?.voiceNoteUrl) return hit.voiceNoteUrl.trim();
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(BIRTHDAY_WHISPER_KEYS[which])?.trim() || null;
  } catch {
    return null;
  }
}
