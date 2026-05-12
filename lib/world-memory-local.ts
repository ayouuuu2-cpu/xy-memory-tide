import { YUNNAN_LANDMARK } from "@/data/memories";
import { migrateLegacyEcho, normalizeEcho, type EchoFootprint } from "@/lib/echo-footprints";
import { migrateLegacyVision, normalize, type VisionDream } from "@/lib/vision-dreams";
import type { EternalWorldState, TimelineEntryView, WorldMemorySnapshot } from "@/lib/world-memory-types";

const STORAGE_KEY = "xy-memory-tide-world-local-v1";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultEternal(): EternalWorldState {
  return { anchorIso: null, milestones: [], birthdayWhispers: {} };
}

function emptySnapshot(): WorldMemorySnapshot {
  return {
    landmark: { ...YUNNAN_LANDMARK },
    timeline: [] as TimelineEntryView[],
    echoes: [],
    wishes: [],
    eternal: defaultEternal(),
  };
}

export function loadLocalWorldSnapshot(): WorldMemorySnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptySnapshot();
    const o = parsed as Record<string, unknown>;

    const echoesRaw = Array.isArray(o.echoes) ? o.echoes : [];
    const wishesRaw = Array.isArray(o.wishes) ? o.wishes : [];
    const echoes = echoesRaw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        return normalizeEcho(migrateLegacyEcho(r));
      })
      .filter((e): e is EchoFootprint => e !== null && typeof e.id === "string" && e.id.length > 0);

    const wishes = wishesRaw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        return normalize(migrateLegacyVision(r));
      })
      .filter((w): w is VisionDream => w !== null && typeof w.id === "string" && w.id.length > 0);

    const timeline = Array.isArray(o.timeline)
      ? (o.timeline as TimelineEntryView[]).filter(
          (t) => t && typeof t.id === "string" && typeof t.content === "string" && typeof t.date === "string",
        )
      : [];

    let eternal = defaultEternal();
    if (o.eternal && typeof o.eternal === "object") {
      const e = o.eternal as Record<string, unknown>;
      const anchor =
        typeof e.anchorIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.anchorIso) ? e.anchorIso : null;
      const bw =
        e.birthdayWhispers && typeof e.birthdayWhispers === "object"
          ? (e.birthdayWhispers as EternalWorldState["birthdayWhispers"])
          : {};
      eternal = { anchorIso: anchor, milestones: [], birthdayWhispers: bw };
    }

    return {
      landmark: { ...YUNNAN_LANDMARK },
      timeline,
      echoes,
      wishes,
      eternal,
    };
  } catch {
    return emptySnapshot();
  }
}

function persist(snapshot: WorldMemorySnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        echoes: snapshot.echoes,
        wishes: snapshot.wishes,
        timeline: snapshot.timeline,
        eternal: snapshot.eternal,
      }),
    );
  } catch {
    /* quota or private mode */
  }
}

export function createEchoLocal(partial: Record<string, unknown>): EchoFootprint {
  const snap = loadLocalWorldSnapshot();
  const id = typeof partial.id === "string" && partial.id ? partial.id : newId("echo");
  const echo = normalizeEcho(
    migrateLegacyEcho({
      ...partial,
      id,
      createdAt: typeof partial.createdAt === "number" ? partial.createdAt : Date.now(),
    }),
  );
  snap.echoes = [echo, ...snap.echoes.filter((e) => e.id !== id)];
  persist(snap);
  return echo;
}

export function patchEchoLocal(id: string, patch: Partial<EchoFootprint>): EchoFootprint | null {
  const snap = loadLocalWorldSnapshot();
  const i = snap.echoes.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const merged = normalizeEcho(migrateLegacyEcho({ ...snap.echoes[i], ...patch, id }));
  snap.echoes[i] = merged;
  persist(snap);
  return merged;
}

export function deleteEchoLocal(id: string): boolean {
  const snap = loadLocalWorldSnapshot();
  const next = snap.echoes.filter((e) => e.id !== id);
  if (next.length === snap.echoes.length) return false;
  snap.echoes = next;
  persist(snap);
  return true;
}

export function createWishLocal(partial: Record<string, unknown>): VisionDream {
  const snap = loadLocalWorldSnapshot();
  const id = typeof partial.id === "string" && partial.id ? partial.id : newId("wish");
  const wish = normalize(
    migrateLegacyVision({
      ...partial,
      id,
      createdAt: typeof partial.createdAt === "number" ? partial.createdAt : Date.now(),
    }),
  );
  snap.wishes = [wish, ...snap.wishes.filter((w) => w.id !== id)];
  persist(snap);
  return wish;
}

export function patchWishLocal(id: string, patch: Partial<VisionDream>): VisionDream | null {
  const snap = loadLocalWorldSnapshot();
  const i = snap.wishes.findIndex((w) => w.id === id);
  if (i < 0) return null;
  const merged = normalize(migrateLegacyVision({ ...snap.wishes[i], ...patch, id }));
  snap.wishes[i] = merged;
  persist(snap);
  return merged;
}

export function deleteWishLocal(id: string): boolean {
  const snap = loadLocalWorldSnapshot();
  const next = snap.wishes.filter((w) => w.id !== id);
  if (next.length === snap.wishes.length) return false;
  snap.wishes = next;
  persist(snap);
  return true;
}
