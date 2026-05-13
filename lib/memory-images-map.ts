import type { GalleryAuthor, GalleryItem, GalleryMeta } from "@/lib/memory-dump-storage";
import { deriveMemoryDumpAuthorForLegacy } from "@/lib/memory-dump-storage";

export type MemoryImageRow = {
  id: string;
  memory_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  storage_path: string | null;
  fragment: unknown;
};

export type MemoryImageFragment = {
  meta?: Partial<GalleryMeta>;
  author?: GalleryAuthor;
  mediaType?: "image" | "video";
  mimeType?: string;
};

function formatTsFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function parseFragment(raw: unknown): MemoryImageFragment {
  if (!raw || typeof raw !== "object") return {};
  return raw as MemoryImageFragment;
}

export function memoryImageRowToGalleryItem(row: MemoryImageRow): GalleryItem {
  const src =
    typeof row.image_url === "string" && row.image_url.trim().length > 0
      ? row.image_url.trim()
      : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const f = parseFragment(row.fragment);
  const metaIn = f.meta ?? {};
  const meta: GalleryMeta = {
    timestamp:
      typeof metaIn.timestamp === "string" && metaIn.timestamp.trim()
        ? metaIn.timestamp.trim()
        : formatTsFromIso(row.created_at),
    mood: typeof metaIn.mood === "string" ? metaIn.mood : "—",
    location: typeof metaIn.location === "string" ? metaIn.location : "—",
  };
  const author =
    f.author && typeof f.author.name === "string" && f.author.name.trim()
      ? { name: f.author.name.trim(), avatar: f.author.avatar?.trim() || undefined }
      : undefined;
  const mimeType = typeof f.mimeType === "string" && f.mimeType.trim() ? f.mimeType.trim() : "image/jpeg";
  const mediaType = f.mediaType === "video" || mimeType.startsWith("video/") ? "video" : "image";
  return {
    id: row.id,
    src,
    caption: row.caption?.trim() || "Untitled",
    meta,
    addedAt: new Date(row.created_at).getTime(),
    author: author ?? deriveMemoryDumpAuthorForLegacy(row.id),
    mediaType,
    mimeType,
    storagePath: row.storage_path ?? undefined,
  };
}

export function galleryItemToFragment(item: Pick<GalleryItem, "meta" | "author" | "mediaType" | "mimeType">): MemoryImageFragment {
  return {
    meta: item.meta,
    author: item.author,
    mediaType: item.mediaType,
    mimeType: item.mimeType,
  };
}
