import type { CelestialBirthdayMode } from "@/lib/celestial";
import { isCloudGalleryClient } from "@/lib/gallery-cloud-config";
import { getPublishedWorldMemorySnapshot, publishWorldMemorySnapshot } from "@/lib/world-memory-cache";
import type { EternalWorldState, WorldMemorySnapshot } from "@/lib/world-memory-types";

export const MEMORY_TIDE_DEFAULT_ANCHOR_ISO = "2019-04-06";

export type Milestone = {
  id: string;
  title: string;
  /** 1–12 */
  anniversaryMonth: number;
  /** 1–31 */
  anniversaryDay: number;
  /** Time-locked whisper (public HTTPS URL from cloud storage). */
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
  return getPublishedWorldMemorySnapshot()?.eternal.anchorIso ?? null;
}

async function mergeEternalIntoCache(next: EternalWorldState): Promise<void> {
  const cur = getPublishedWorldMemorySnapshot();
  if (cur) {
    publishWorldMemorySnapshot({ ...cur, eternal: next });
    return;
  }
  try {
    const res = await fetch("/api/world-memory", { cache: "no-store" });
    if (res.ok) {
      const full = (await res.json()) as WorldMemorySnapshot;
      publishWorldMemorySnapshot(full);
    }
  } catch {
    /* ignore */
  }
}

export async function saveAnchorIso(iso: string): Promise<void> {
  if (typeof window === "undefined" || !isCloudGalleryClient()) return;
  const v = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
  const res = await fetch("/api/world-eternal", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anchorIso: v }),
  });
  if (!res.ok) return;
  const j = (await res.json()) as { eternal?: EternalWorldState };
  if (j.eternal) await mergeEternalIntoCache(j.eternal);
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

export async function ensureDefaultAnchor(): Promise<void> {
  if (typeof window === "undefined" || !isCloudGalleryClient()) return;
  if (loadAnchorIso()) return;
  await saveAnchorIso(MEMORY_TIDE_DEFAULT_ANCHOR_ISO);
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
  return getPublishedWorldMemorySnapshot()?.eternal.milestones ?? [];
}

export async function saveMilestones(rows: Milestone[]): Promise<void> {
  if (typeof window === "undefined" || !isCloudGalleryClient()) return;
  const res = await fetch("/api/world-eternal", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestones: rows }),
  });
  if (!res.ok) return;
  const j = (await res.json()) as { eternal?: EternalWorldState };
  if (j.eternal) await mergeEternalIntoCache(j.eternal);
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
  void saveMilestones(list);
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
  void saveMilestones(list);
  return list;
}

export function removeMilestone(id: string): Milestone[] {
  const list = loadMilestones().filter((r) => r.id !== id);
  void saveMilestones(list);
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

/** Milestone on 9·14 / 11·12 with `voiceNoteUrl`, else optional stored birthday whisper URL. */
export function findBirthdayWhisperUrl(which: CelestialBirthdayMode): string | null {
  const month = which === "virgo" ? 9 : 11;
  const day = which === "virgo" ? 14 : 12;
  const hit = loadMilestones().find((m) => m.anniversaryMonth === month && m.anniversaryDay === day && m.voiceNoteUrl.trim());
  if (hit?.voiceNoteUrl) return hit.voiceNoteUrl.trim();
  const bw = getPublishedWorldMemorySnapshot()?.eternal.birthdayWhispers?.[which];
  return typeof bw === "string" && bw.trim() ? bw.trim() : null;
}
