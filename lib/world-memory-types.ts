import type { LandmarkMemory } from "@/data/memories";
import type { CelestialBirthdayMode } from "@/lib/celestial";
import type { Milestone } from "@/lib/eternal-days";
import { migrateLegacyEcho, normalizeEcho, type EchoFootprint } from "@/lib/echo-footprints";
import { migrateLegacyVision, normalize, type VisionDream } from "@/lib/vision-dreams";

export type TimelineEntryView = {
  id: string;
  content: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  memoryId: string | null;
};

export type EternalWorldState = {
  anchorIso: string | null;
  milestones: Milestone[];
  birthdayWhispers: Partial<Record<CelestialBirthdayMode, string>>;
};

export type WorldMemorySnapshot = {
  landmark: LandmarkMemory;
  timeline: TimelineEntryView[];
  echoes: EchoFootprint[];
  wishes: VisionDream[];
  eternal: EternalWorldState;
};

export function echoFromWorldRow(row: { id: string; payload: unknown }): EchoFootprint {
  const p = row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
  return normalizeEcho(migrateLegacyEcho({ ...p, id: row.id }));
}

export function wishFromWorldRow(row: { id: string; payload: unknown }): VisionDream {
  const p = row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
  return normalize(migrateLegacyVision({ ...p, id: row.id }));
}

function parseMilestone(raw: unknown): Milestone | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  const month = Math.min(12, Math.max(1, Math.round(Number(row.anniversaryMonth))));
  const day = Math.min(31, Math.max(1, Math.round(Number(row.anniversaryDay))));
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

export function eternalFromWorldRow(row: {
  anchor_iso: string | null;
  milestones: unknown;
  birthday_whispers: unknown;
}): EternalWorldState {
  const rawM = row.milestones;
  const milestones: Milestone[] = [];
  if (Array.isArray(rawM)) {
    for (const x of rawM) {
      const m = parseMilestone(x);
      if (m) milestones.push(m);
    }
  }
  const bw = row.birthday_whispers && typeof row.birthday_whispers === "object" ? row.birthday_whispers : {};
  const o = bw as Record<string, unknown>;
  const birthdayWhispers: Partial<Record<CelestialBirthdayMode, string>> = {};
  const v = o.virgo;
  const s = o.scorpio;
  if (typeof v === "string" && v.trim()) birthdayWhispers.virgo = v.trim();
  if (typeof s === "string" && s.trim()) birthdayWhispers.scorpio = s.trim();
  const anchor = row.anchor_iso ? String(row.anchor_iso).slice(0, 10) : null;
  return {
    anchorIso: anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : null,
    milestones,
    birthdayWhispers,
  };
}

export function timelineFromRow(row: {
  id: string;
  content: string;
  date: string;
  memory_id: string | null;
}): TimelineEntryView {
  return {
    id: row.id,
    content: row.content,
    date: String(row.date).slice(0, 10),
    memoryId: row.memory_id,
  };
}
