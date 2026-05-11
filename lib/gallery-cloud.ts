import type { GalleryAuthor, GalleryItem, GalleryMeta } from "@/lib/memory-dump-storage";

/** Client + server: cloud mode when this is true (build-time env). */
export function isCloudGalleryClient(): boolean {
  return process.env.NEXT_PUBLIC_MEMORY_GALLERY_CLOUD === "1";
}

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

export async function fetchCloudGallery(): Promise<GalleryItem[]> {
  const res = await fetch("/api/gallery", { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Gallery fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { items: PhotoRow[] };
  return (data.items ?? []).map(photoRowToGalleryItem);
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
  const res = await fetch("/api/gallery/upload", { method: "POST", body: fd });
  if (!res.ok) {
    let msg = "Upload failed";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      const t = await res.text();
      if (t) msg = t;
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { item: PhotoRow };
  return photoRowToGalleryItem(data.item);
}

export async function patchCloudFragment(
  id: string,
  patch: { caption?: string; meta?: Partial<GalleryMeta>; author?: GalleryAuthor },
): Promise<void> {
  const res = await fetch(`/api/gallery/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Update failed");
  }
}

export async function deleteCloudFragment(id: string): Promise<void> {
  const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Delete failed");
  }
}
