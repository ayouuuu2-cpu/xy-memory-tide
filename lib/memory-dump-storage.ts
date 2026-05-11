const STORAGE_KEY = "memory-tide-memory-dump-gallery-v1";
const UPLOADER_PROFILE_KEY = "memory-tide-memory-dump-uploader-v1";
const MAX_ITEMS = 36;
/** Rough guard so localStorage stays under typical ~5MB budgets (base64 expands). */
const MAX_DATA_URL_CHARS = 1_800_000;

export type GalleryMeta = {
  timestamp: string;
  mood: string;
  location: string;
};

/** Who added this fragment — shown on cards (local-only until you wire a backend). */
export type GalleryAuthor = {
  name: string;
  avatar?: string;
};

export type GalleryItem = {
  id: string;
  src: string;
  caption: string;
  meta: GalleryMeta;
  addedAt: number;
  author?: GalleryAuthor;
  /** Defaults to image when absent (legacy local items). */
  mediaType?: "image" | "video";
  mimeType?: string;
  /** Supabase Storage object path — used for cloud delete. */
  storagePath?: string;
};

const LEGACY_AUTHOR_NAMES = [
  "流星捕手",
  "小夜猫",
  "云边信使",
  "观星小熊",
  "碎片精灵",
  "银河邮差",
  "小主人的碎片",
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable cute nickname for older items saved before `author` existed. */
export function deriveMemoryDumpAuthorForLegacy(id: string): GalleryAuthor {
  const name = LEGACY_AUTHOR_NAMES[hashId(id) % LEGACY_AUTHOR_NAMES.length];
  return { name };
}

/** Parse `author` from localStorage JSON; invalid → undefined. */
export function parseStoredAuthor(raw: unknown): GalleryAuthor | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return undefined;
  const avatar = typeof o.avatar === "string" ? o.avatar.trim() : "";
  return { name, avatar: avatar || undefined };
}

/** Effective author for UI: stored `author` or legacy fallback (gallery + globe pins). */
export function resolveGalleryAuthor(item: { id: string; author?: GalleryAuthor }): GalleryAuthor {
  const n = item.author?.name?.trim();
  if (n) {
    const avatar = item.author?.avatar?.trim();
    return { name: n, avatar: avatar || undefined };
  }
  return deriveMemoryDumpAuthorForLegacy(item.id);
}

/** Alias for `GalleryItem` call sites. */
export function resolveMemoryDumpAuthor(item: GalleryItem): GalleryAuthor {
  return resolveGalleryAuthor(item);
}

/** Nickname + optional avatar URL used when creating new fragments (browser local). */
export function loadMemoryDumpUploaderProfile(): GalleryAuthor {
  if (typeof window === "undefined") return { name: "观星小管理员" };
  try {
    const raw = window.localStorage.getItem(UPLOADER_PROFILE_KEY);
    if (!raw) return { name: "观星小管理员" };
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return { name: "观星小管理员" };
    const o = j as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const avatar = typeof o.avatar === "string" ? o.avatar.trim() : "";
    return {
      name: name || "观星小管理员",
      avatar: avatar || undefined,
    };
  } catch {
    return { name: "观星小管理员" };
  }
}

export function saveMemoryDumpUploaderProfile(author: GalleryAuthor): void {
  if (typeof window === "undefined") return;
  try {
    const payload: GalleryAuthor = {
      name: author.name.trim() || "观星小管理员",
      avatar: author.avatar?.trim() || undefined,
    };
    window.localStorage.setItem(UPLOADER_PROFILE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Hue 0–359 for star-trail glow keyed by id + name. */
export function memoryDumpAuthorOrbitHue(seed: string): number {
  return hashId(seed) % 360;
}

function formatTs(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function createGalleryItemFromDataUrl(
  src: string,
  caption: string,
  authorOverride?: GalleryAuthor,
): GalleryItem {
  const now = new Date();
  const author = authorOverride ?? loadMemoryDumpUploaderProfile();
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `img-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    src,
    caption: caption.trim() || "未命名",
    meta: {
      timestamp: formatTs(now),
      mood: "—",
      location: "—",
    },
    addedAt: now.getTime(),
    author: {
      name: author.name.trim() || "观星小管理员",
      avatar: author.avatar?.trim() || undefined,
    },
    mediaType: "image",
    mimeType: "image/jpeg",
  };
}

export function loadMemoryDumpGallery(): GalleryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is GalleryItem => {
      if (x == null || typeof x !== "object") return false;
      const g = x as GalleryItem;
      if (
        typeof g.id !== "string" ||
        typeof g.src !== "string" ||
        typeof g.caption !== "string" ||
        typeof g.addedAt !== "number" ||
        g.meta == null ||
        typeof g.meta.timestamp !== "string"
      ) {
        return false;
      }
      if (g.author != null) {
        const a = g.author;
        if (typeof a !== "object" || typeof a.name !== "string") return false;
        if (a.avatar !== undefined && typeof a.avatar !== "string") return false;
      }
      if (g.mediaType !== undefined && g.mediaType !== "image" && g.mediaType !== "video") return false;
      if (g.mimeType !== undefined && typeof g.mimeType !== "string") return false;
      if (g.storagePath !== undefined && typeof g.storagePath !== "string") return false;
      return true;
    });
  } catch {
    return [];
  }
}

export function saveMemoryDumpGallery(items: GalleryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota — caller may surface a toast; keep last good write if needed later
  }
}

export function appendGalleryItems(current: GalleryItem[], additions: GalleryItem[]): GalleryItem[] {
  const merged = [...additions, ...current].slice(0, MAX_ITEMS);
  saveMemoryDumpGallery(merged);
  return merged;
}

export function removeGalleryItem(current: GalleryItem[], id: string): GalleryItem[] {
  const next = current.filter((x) => x.id !== id);
  saveMemoryDumpGallery(next);
  return next;
}

export function updateGalleryItem(
  current: GalleryItem[],
  id: string,
  patch: { caption?: string; meta?: Partial<GalleryMeta>; author?: GalleryAuthor },
): GalleryItem[] {
  const next = current.map((x) => {
    if (x.id !== id) return x;
    const caption = patch.caption !== undefined ? patch.caption.trim() || x.caption : x.caption;
    const meta = patch.meta ? { ...x.meta, ...patch.meta } : x.meta;
    let author = x.author;
    if (patch.author !== undefined) {
      author = {
        name: patch.author.name.trim() || resolveGalleryAuthor(x).name,
        avatar: patch.author.avatar?.trim() || undefined,
      };
    }
    return { ...x, caption, meta, author };
  });
  saveMemoryDumpGallery(next);
  return next;
}

export { MAX_DATA_URL_CHARS, MAX_ITEMS, STORAGE_KEY, UPLOADER_PROFILE_KEY };
