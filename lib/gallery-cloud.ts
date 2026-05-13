import type { GalleryAuthor, GalleryItem, GalleryMeta } from "@/lib/memory-dump-storage";
import { maxGalleryItemsClient } from "@/lib/gallery-limits";
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from "@/lib/supabase/browser";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { announceMemoryImagesChanged } from "@/lib/memory-images-events";
import { memoryImageRowToGalleryItem, type MemoryImageRow } from "@/lib/memory-images-map";

export { isCloudGalleryClient, isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";

/** @deprecated Legacy `photos` row shape; retained for older API routes. */
export type PhotoRow = {
  id: string;
  storage_path: string;
  public_url: string;
  media_type: "image" | "video";
  mime_type: string;
  bytes: number;
  caption: string;
  author_name: string;
  author_avatar: string | null;
  meta: GalleryMeta;
  created_at: string;
};

/** @deprecated */
export function photoRowToGalleryItem(row: PhotoRow): GalleryItem {
  const m = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {};
  return {
    id: row.id,
    src: row.public_url,
    caption: row.caption,
    meta: {
      timestamp: typeof m.timestamp === "string" ? m.timestamp : "",
      mood: typeof m.mood === "string" ? m.mood : "—",
      location: typeof m.location === "string" ? m.location : "—",
    },
    addedAt: new Date(row.created_at).getTime(),
    author: {
      name: row.author_name,
      avatar: row.author_avatar?.trim() || undefined,
    },
    mediaType: row.media_type,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
  };
}

const MEMORY_IMAGE_COLUMNS =
  "id, memory_id, image_url, caption, created_at, storage_path, fragment";

/** Read body once — never call both res.json() and res.text() (second read throws "disturbed or locked"). */
async function readJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function fetchCloudGallery(): Promise<GalleryItem[]> {
  const cap = maxGalleryItemsClient();
  if (typeof window !== "undefined" && hasSupabaseBrowserConfig()) {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("memory_images")
        .select(MEMORY_IMAGE_COLUMNS)
        .eq("memory_id", YUNNAN_MEMORY_ROW_UUID)
        .order("created_at", { ascending: false })
        .limit(cap);
      if (error) throw new Error(error.message);
      return ((data ?? []) as MemoryImageRow[]).map(memoryImageRowToGalleryItem);
    } catch {
      /* fall through to API */
    }
  }

  const res = await fetch("/api/memory-images", { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Gallery fetch failed (${res.status})`);
  }
  const data = await readJsonBody<{ items?: MemoryImageRow[] }>(res);
  return (data.items ?? []).map(memoryImageRowToGalleryItem);
}

export async function uploadCloudFragment(params: {
  file: File;
  caption: string;
  author: GalleryAuthor;
  meta: GalleryMeta;
}): Promise<GalleryItem> {
  const fd = new FormData();
  fd.set("file", params.file);
  fd.set("caption", params.caption);
  fd.set("authorName", params.author.name.trim());
  if (params.author.avatar?.trim()) fd.set("authorAvatar", params.author.avatar.trim());
  fd.set("meta", JSON.stringify(params.meta));
  const res = await fetch("/api/memory-images/upload", { method: "POST", body: fd });
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw.trim() || `Upload failed (${res.status})`;
    try {
      const j = JSON.parse(raw) as { error?: string };
      if (typeof j.error === "string" && j.error.trim()) msg = j.error.trim();
    } catch {
      /* keep msg from raw text */
    }
    throw new Error(msg);
  }
  let data: { item?: MemoryImageRow };
  try {
    data = raw ? (JSON.parse(raw) as { item?: MemoryImageRow }) : {};
  } catch {
    throw new Error("Upload succeeded but server returned invalid JSON.");
  }
  if (!data?.item) throw new Error("Upload succeeded but response was empty.");
  announceMemoryImagesChanged();
  return memoryImageRowToGalleryItem(data.item);
}

export async function patchCloudFragment(
  id: string,
  patch: { caption?: string; meta?: Partial<GalleryMeta>; author?: GalleryAuthor },
): Promise<void> {
  const res = await fetch(`/api/memory-images/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const raw = await res.text();
    let j: { error?: string } = {};
    try {
      j = JSON.parse(raw) as { error?: string };
    } catch {
      /* ignore */
    }
    throw new Error(j.error?.trim() || raw.trim() || "Update failed");
  }
  announceMemoryImagesChanged();
}

export async function deleteCloudFragment(id: string): Promise<void> {
  const res = await fetch(`/api/memory-images/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const raw = await res.text();
    let j: { error?: string } = {};
    try {
      j = JSON.parse(raw) as { error?: string };
    } catch {
      /* ignore */
    }
    throw new Error(j.error?.trim() || raw.trim() || "Delete failed");
  }
  announceMemoryImagesChanged();
}
