import { maxGalleryItemsClient } from "@/lib/gallery-limits";
import { getSessionIdentity, setSessionIdentity } from "@/lib/session-identity-store";

export type GalleryMeta = {
  timestamp: string;
  mood: string;
  location: string;
};

/** Who added this fragment — shown on cards; stored in Supabase for cloud items. */
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

/** Parse `author` from JSON payloads (e.g. Supabase `fragment`); invalid → undefined. */
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

/** Nickname + optional avatar URL for new fragments (session memory; synced with onboarding modal). */
export function loadMemoryDumpUploaderProfile(): GalleryAuthor {
  if (typeof window === "undefined") return { name: "观星小管理员" };
  const i = getSessionIdentity();
  if (i?.displayName?.trim()) {
    return { name: i.displayName.trim(), avatar: i.avatarUrl?.trim() || undefined };
  }
  return { name: "观星小管理员" };
}

export function saveMemoryDumpUploaderProfile(author: GalleryAuthor): void {
  if (typeof window === "undefined") return;
  const name = author.name.trim() || "观星小管理员";
  setSessionIdentity({
    displayName: name,
    avatarUrl: author.avatar?.trim() || undefined,
    settledAt: Date.now(),
  });
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
  return [];
}

export function saveMemoryDumpGallery(_items: GalleryItem[]): void {}

export function appendGalleryItems(current: GalleryItem[], additions: GalleryItem[]): GalleryItem[] {
  const cap = maxGalleryItemsClient();
  const merged = [...additions, ...current].slice(0, cap);
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

