import { loadMemoryDumpUploaderProfile, parseStoredAuthor, type GalleryAuthor } from "@/lib/memory-dump-storage";
import { parseMemoryObjects, type MemoryObject } from "@/lib/memory-objects";

export type VisionDream = {
  id: string;
  query: string;
  displayName: string;
  lat: number;
  lng: number;
  createdAt: number;
  /** Slot 1 — gallery image URLs (Supabase Storage). */
  gallery: string[];
  /** Slot 2 — voice / audio (legacy mirror). */
  audioUrl: string;
  /** Whisper capsule URL (same slot; preferred for Whisper player). */
  voiceNoteUrl: string;
  /** Slot 3 — ISO date YYYY-MM-DD. */
  recordedDate: string;
  /** Slot 4 — portal link. */
  linkUrl: string;
  /** Wish narrative — validated with link on save. */
  diary: string;
  /** Ritual: wish has ascended to the cloud layer (no longer on globe). */
  isRealized: boolean;
  /** Who marked this wish — same shape as Memory Dump `author`. */
  author?: GalleryAuthor;
  /** Cinematic memory objects for scene rendering. */
  memoryObjects: MemoryObject[];
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function migrateLegacyVision(row: Record<string, unknown>): VisionDream {
  const galleryFromNew = Array.isArray(row.gallery)
    ? row.gallery.filter((u): u is string => typeof u === "string")
    : [];
  const galleryFromOld = Array.isArray(row.photoDataUrls)
    ? (row.photoDataUrls as unknown[]).filter((u): u is string => typeof u === "string")
    : [];
  const gallery = galleryFromNew.length ? galleryFromNew : galleryFromOld;

  const guide = typeof row.guide === "string" ? row.guide : "";
  const restaurants = typeof row.restaurants === "string" ? row.restaurants : "";
  const diaryFromNew = typeof row.diary === "string" ? row.diary : "";
  const legacyParts = [guide, restaurants].filter(Boolean);
  const diaryMerged = diaryFromNew || (legacyParts.length ? legacyParts.join("\n\n") : "");

  const recordedDate =
    typeof row.recordedDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(row.recordedDate)
      ? row.recordedDate.slice(0, 10)
      : todayIsoDate();

  const audioUrl = typeof row.audioUrl === "string" ? row.audioUrl : "";
  const voiceNoteUrl =
    typeof row.voiceNoteUrl === "string" ? row.voiceNoteUrl : audioUrl;
  const memoryObjects = parseMemoryObjects(row.memoryObjects);
  if (memoryObjects.length === 0) {
    for (const src of gallery) {
      memoryObjects.push({
        type: "photo",
        id: `photo-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        url: src,
      });
    }
    if ((voiceNoteUrl || audioUrl).trim()) {
      memoryObjects.push({
        type: "music",
        id: `music-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        url: (voiceNoteUrl || audioUrl).trim(),
        recordedAt: `${recordedDate}T12:00:00.000Z`,
      });
    }
    if (typeof row.linkUrl === "string" && row.linkUrl.trim()) {
      memoryObjects.push({
        type: "link",
        id: `link-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        url: row.linkUrl.trim(),
      });
    }
    if (diaryMerged.trim()) {
      memoryObjects.push({
        type: "text",
        id: `text-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        content: diaryMerged.trim(),
        noteStyle: "handwritten",
      });
    }
  }

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
    diary: diaryMerged,
    isRealized: typeof row.isRealized === "boolean" ? row.isRealized : false,
    author: parseStoredAuthor(row.author),
    memoryObjects,
  };
}

export function normalize(row: VisionDream): VisionDream {
  const audioUrl = typeof row.audioUrl === "string" ? row.audioUrl : "";
  const voiceNoteUrl = typeof row.voiceNoteUrl === "string" ? row.voiceNoteUrl : "";
  const whisper = voiceNoteUrl || audioUrl;
  let author: GalleryAuthor | undefined;
  if (row.author && typeof row.author === "object" && typeof row.author.name === "string") {
    const n = row.author.name.trim();
    if (n) author = { name: n, avatar: row.author.avatar?.trim() || undefined };
  }
  const memoryObjects = parseMemoryObjects(row.memoryObjects);
  const photos = memoryObjects.filter((m) => m.type === "photo").map((m) => m.url);
  const music = memoryObjects.find((m) => m.type === "music")?.url ?? "";
  const link = memoryObjects.find((m) => m.type === "link")?.url ?? "";
  const text = memoryObjects.find((m) => m.type === "text")?.content ?? "";
  return {
    ...row,
    query: typeof row.query === "string" ? row.query : "Place",
    displayName: typeof row.displayName === "string" ? row.displayName : row.query,
    gallery: photos.length > 0 ? photos : Array.isArray(row.gallery) ? row.gallery.filter((u): u is string => typeof u === "string") : [],
    audioUrl: music || whisper,
    voiceNoteUrl: music || whisper,
    recordedDate:
      typeof row.recordedDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(row.recordedDate)
        ? row.recordedDate.slice(0, 10)
        : todayIsoDate(),
    linkUrl: link || (typeof row.linkUrl === "string" ? row.linkUrl : ""),
    diary: text || (typeof row.diary === "string" ? row.diary : ""),
    isRealized: Boolean(row.isRealized),
    author,
    memoryObjects,
  };
}

export function loadVisionDreams(): VisionDream[] {
  return [];
}

export function saveVisionDreams(_rows: VisionDream[]): void {
  void _rows;
}

export function addVisionDream(
  fp: Omit<
    VisionDream,
    "id" | "createdAt" | "gallery" | "audioUrl" | "voiceNoteUrl" | "recordedDate" | "linkUrl" | "diary" | "isRealized" | "author" | "memoryObjects"
  >,
): VisionDream[] {
  const next = normalize({
    ...fp,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    gallery: [],
    audioUrl: "",
    voiceNoteUrl: "",
    recordedDate: todayIsoDate(),
    linkUrl: "",
    diary: "",
    isRealized: false,
    author: loadMemoryDumpUploaderProfile(),
    memoryObjects: [],
  });
  const list = [next, ...loadVisionDreams()];
  return list;
}

export function removeVisionDream(id: string): VisionDream[] {
  const list = loadVisionDreams().filter((r) => r.id !== id);
  return list;
}

export function patchVisionDream(
  id: string,
  patch: Partial<Pick<VisionDream, "gallery" | "audioUrl" | "voiceNoteUrl" | "recordedDate" | "linkUrl" | "diary" | "isRealized" | "author" | "memoryObjects">>,
): VisionDream[] {
  const list = loadVisionDreams().map((r) => {
    if (r.id !== id) return r;
    const merged = { ...r, ...patch };
    if (patch.voiceNoteUrl !== undefined && patch.audioUrl === undefined) merged.audioUrl = patch.voiceNoteUrl;
    if (patch.audioUrl !== undefined && patch.voiceNoteUrl === undefined) merged.voiceNoteUrl = patch.audioUrl;
    return normalize(merged);
  });
  return list;
}
