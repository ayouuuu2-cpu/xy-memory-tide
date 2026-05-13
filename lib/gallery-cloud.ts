import type { GalleryAuthor, GalleryItem, GalleryMeta } from "@/lib/memory-dump-storage";
import { maxGalleryItemsClient } from "@/lib/gallery-limits";
import {
  ALLOWED_UPLOAD_MIMES,
  extForMime,
  MAX_UPLOAD_BYTES,
  mediaTypeForMime,
} from "@/lib/gallery-server-constants";
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from "@/lib/supabase/browser";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { announceMemoryImagesChanged } from "@/lib/memory-images-events";
import { galleryItemToFragment, memoryImageRowToGalleryItem, type MemoryImageRow } from "@/lib/memory-images-map";
import { getWorldPublicStorageBucket } from "@/lib/world-public-storage-bucket";

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

function mimeGuessGalleryFile(name: string): string | null {
  const n = name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  if (n.endsWith(".mov")) return "video/quicktime";
  return null;
}

function effectiveGalleryMime(file: File): string {
  const t = file.type?.trim();
  if (t && ALLOWED_UPLOAD_MIMES.has(t)) return t;
  const g = file.name ? mimeGuessGalleryFile(file.name) : null;
  if (g && ALLOWED_UPLOAD_MIMES.has(g)) return g;
  return t || g || "application/octet-stream";
}

/** Browser → Supabase Storage + `memory_images` row (no Vercel body limit). */
async function uploadCloudFragmentDirect(params: {
  file: File;
  caption: string;
  author: GalleryAuthor;
  meta: GalleryMeta;
}): Promise<GalleryItem> {
  const supabase = getSupabaseBrowser();
  const bucket = getWorldPublicStorageBucket();
  const mime = effectiveGalleryMime(params.file);
  if (!ALLOWED_UPLOAD_MIMES.has(mime)) {
    const err = new Error(`不支持的类型：${mime}`);
    console.error("[MemoryDump upload]", err);
    throw err;
  }
  if (params.file.size > MAX_UPLOAD_BYTES) {
    const err = new Error(`文件超过 ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB。`);
    console.error("[MemoryDump upload]", err);
    throw err;
  }

  const cap = maxGalleryItemsClient();
  const { count, error: countErr } = await supabase
    .from("memory_images")
    .select("id", { count: "exact", head: true })
    .eq("memory_id", YUNNAN_MEMORY_ROW_UUID);
  if (countErr) {
    console.error("[MemoryDump upload] count", countErr);
    throw new Error(countErr.message);
  }
  if (count != null && count >= cap) {
    const err = new Error(`相册已满（${cap} 张）。请先删除一些碎片。`);
    console.error("[MemoryDump upload]", err);
    throw err;
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const ext = extForMime(mime);
  const storagePath = `fragments/${id}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, params.file, {
    contentType: mime,
    upsert: false,
    cacheControl: "3600",
  });
  if (upErr) {
    console.error("[MemoryDump upload] storage.upload", upErr);
    throw new Error(upErr.message || String(upErr));
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl?.trim() ?? "";
  if (!publicUrl.startsWith("http")) {
    const err = new Error("Storage 已上传但未得到公开 URL，请检查 bucket 是否 Public。");
    console.error("[MemoryDump upload]", err, { pub });
    throw err;
  }

  const caption = params.caption.trim() || "Untitled";
  const authorName = params.author.name.trim();
  if (!authorName) {
    const err = new Error("作者昵称为空。");
    console.error("[MemoryDump upload]", err);
    throw err;
  }
  const authorAvatar =
    typeof params.author.avatar === "string" && params.author.avatar.trim()
      ? params.author.avatar.trim()
      : null;

  const mediaType = mediaTypeForMime(mime);
  const fragment = galleryItemToFragment({
    meta: params.meta,
    author: { name: authorName, avatar: authorAvatar ?? undefined },
    mediaType,
    mimeType: mime,
  });

  const { data: row, error: insErr } = await supabase
    .from("memory_images")
    .insert({
      id,
      memory_id: YUNNAN_MEMORY_ROW_UUID,
      image_url: publicUrl,
      caption,
      storage_path: storagePath,
      fragment,
    })
    .select(MEMORY_IMAGE_COLUMNS)
    .single();

  if (insErr || !row) {
    console.error("[MemoryDump upload] memory_images.insert", insErr);
    const { error: rmErr } = await supabase.storage.from(bucket).remove([storagePath]);
    if (rmErr) console.error("[MemoryDump upload] storage rollback remove failed", rmErr);
    throw new Error(insErr?.message ?? "写入相册数据库失败（请确认已执行 schema 中的 memory_images INSERT 策略）。");
  }

  announceMemoryImagesChanged();
  return memoryImageRowToGalleryItem(row as MemoryImageRow);
}

/** Legacy: multipart through Vercel (小文件可用，大文件易 413/500). */
async function uploadCloudFragmentViaServerApi(params: {
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
      /* keep msg */
    }
    const err = new Error(msg);
    console.error("[MemoryDump upload] /api/memory-images/upload", err, { status: res.status, raw: raw.slice(0, 500) });
    throw err;
  }
  let data: { item?: MemoryImageRow };
  try {
    data = raw ? (JSON.parse(raw) as { item?: MemoryImageRow }) : {};
  } catch (parseErr) {
    console.error("[MemoryDump upload] invalid JSON", parseErr, raw.slice(0, 300));
    throw new Error("Upload succeeded but server returned invalid JSON.");
  }
  if (!data?.item) {
    const err = new Error("Upload succeeded but response was empty.");
    console.error("[MemoryDump upload]", err, data);
    throw err;
  }
  announceMemoryImagesChanged();
  return memoryImageRowToGalleryItem(data.item);
}

export async function uploadCloudFragment(params: {
  file: File;
  caption: string;
  author: GalleryAuthor;
  meta: GalleryMeta;
}): Promise<GalleryItem> {
  try {
    if (typeof window !== "undefined" && hasSupabaseBrowserConfig()) {
      return await uploadCloudFragmentDirect(params);
    }
    return await uploadCloudFragmentViaServerApi(params);
  } catch (e) {
    console.error("[MemoryDump upload] uploadCloudFragment", e);
    throw e instanceof Error ? e : new Error(String(e));
  }
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
