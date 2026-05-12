import { loadMemoryDumpUploaderProfile, parseStoredAuthor, type GalleryAuthor } from "@/lib/memory-dump-storage";

export type EchoFootprint = {
  id: string;
  /** Raw search query (city name). */
  query: string;
  /** Human label from geocoder (often includes region). */
  displayName: string;
  lat: number;
  lng: number;
  createdAt: number;
  /** Slot 1 — gallery image URLs (Supabase Storage). */
  gallery: string[];
  /** Slot 2 — voice / music data URL or remote URL (legacy mirror of whisper). */
  audioUrl: string;
  /** Whisper capsule URL (same slot as audio; preferred for Eternal Whispers UI). */
  voiceNoteUrl: string;
  /** Slot 3 — ISO calendar date (YYYY-MM-DD). Required for Trace saves. */
  recordedDate: string;
  /** Slot 4 — external portal URL. */
  linkUrl: string;
  /** Who marked this pin — same shape as Memory Dump gallery `author`. */
  author?: GalleryAuthor;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function migrateLegacyEcho(row: Record<string, unknown>): EchoFootprint {
  const galleryFromNew = Array.isArray(row.gallery)
    ? row.gallery.filter((u): u is string => typeof u === "string")
    : [];
  const galleryFromOld = Array.isArray(row.photoDataUrls)
    ? (row.photoDataUrls as unknown[]).filter((u): u is string => typeof u === "string")
    : [];
  const gallery = galleryFromNew.length ? galleryFromNew : galleryFromOld;

  const recordedDate =
    typeof row.recordedDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(row.recordedDate)
      ? row.recordedDate.slice(0, 10)
      : todayIsoDate();

  const audioUrl = typeof row.audioUrl === "string" ? row.audioUrl : "";
  const voiceNoteUrl =
    typeof row.voiceNoteUrl === "string" ? row.voiceNoteUrl : audioUrl;

  return {
    id: String(row.id ?? ""),
    query: typeof row.query === "string" ? row.query : "Place",
    displayName: typeof row.displayName === "string" ? row.displayName : String(row.query ?? "Place"),
    lat: typeof row.lat === "number" ? row.lat : 0,
    lng: typeof row.lng === "number" ? row.lng : 0,
    createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
    gallery,
    audioUrl: voiceNoteUrl || audioUrl,
    voiceNoteUrl: voiceNoteUrl || audioUrl,
    recordedDate,
    linkUrl: typeof row.linkUrl === "string" ? row.linkUrl : "",
    author: parseStoredAuthor(row.author),
  };
}

export function normalizeEcho(row: EchoFootprint): EchoFootprint {
  const audioUrl = typeof row.audioUrl === "string" ? row.audioUrl : "";
  const voiceNoteUrl = typeof row.voiceNoteUrl === "string" ? row.voiceNoteUrl : "";
  const whisper = voiceNoteUrl || audioUrl;
  let author: GalleryAuthor | undefined;
  if (row.author && typeof row.author === "object" && typeof row.author.name === "string") {
    const n = row.author.name.trim();
    if (n) author = { name: n, avatar: row.author.avatar?.trim() || undefined };
  }
  return {
    ...row,
    query: typeof row.query === "string" ? row.query : "Place",
    displayName: typeof row.displayName === "string" ? row.displayName : row.query,
    gallery: Array.isArray(row.gallery) ? row.gallery.filter((u): u is string => typeof u === "string") : [],
    audioUrl: whisper,
    voiceNoteUrl: whisper,
    recordedDate:
      typeof row.recordedDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(row.recordedDate)
        ? row.recordedDate.slice(0, 10)
        : todayIsoDate(),
    linkUrl: typeof row.linkUrl === "string" ? row.linkUrl : "",
    author,
  };
}

export function loadEchoFootprints(): EchoFootprint[] {
  return [];
}

export function saveEchoFootprints(_rows: EchoFootprint[]) {}

export function addEchoFootprint(
  fp: Omit<EchoFootprint, "id" | "createdAt" | "gallery" | "audioUrl" | "voiceNoteUrl" | "recordedDate" | "linkUrl" | "author">,
): EchoFootprint[] {
  const next = normalizeEcho({
    ...fp,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    gallery: [],
    audioUrl: "",
    voiceNoteUrl: "",
    recordedDate: todayIsoDate(),
    linkUrl: "",
    author: loadMemoryDumpUploaderProfile(),
  });
  const list = [next, ...loadEchoFootprints()];
  return list;
}

export function patchEchoFootprint(
  id: string,
  patch: Partial<Pick<EchoFootprint, "gallery" | "audioUrl" | "voiceNoteUrl" | "recordedDate" | "linkUrl" | "author">>,
): EchoFootprint[] {
  const list = loadEchoFootprints().map((r) => {
    if (r.id !== id) return r;
    const merged = { ...r, ...patch };
    if (patch.voiceNoteUrl !== undefined && patch.audioUrl === undefined) merged.audioUrl = patch.voiceNoteUrl;
    if (patch.audioUrl !== undefined && patch.voiceNoteUrl === undefined) merged.voiceNoteUrl = patch.audioUrl;
    return normalizeEcho(merged);
  });
  return list;
}

export function removeEchoFootprint(id: string): EchoFootprint[] {
  const list = loadEchoFootprints().filter((r) => r.id !== id);
  return list;
}
