"use client";

import type { EchoFootprint } from "@/lib/echo-footprints";
import type { VisionDream } from "@/lib/vision-dreams";
import {
  createEchoLocal,
  createWishLocal,
  deleteEchoLocal,
  deleteWishLocal,
  loadLocalWorldSnapshot,
  patchEchoLocal,
  patchWishLocal,
} from "@/lib/world-memory-local";
import type { MemoryObject } from "@/lib/memory-objects";
import type { QuestPhotoRecord, QuestVariant } from "@/lib/quest-photos";
import { hasSupabaseBrowserConfig, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { EternalWorldState, TimelineEntryView, WorldMemorySnapshot } from "@/lib/world-memory-types";
import { getWorldPublicStorageBucket } from "@/lib/world-public-storage-bucket";
import { MAX_UPLOAD_BYTES, WORLD_UPLOAD_MIMES, extForWorldMime } from "@/lib/world-upload-constants";

async function parseJson(res: Response): Promise<unknown> {
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/** Echoes/wishes that exist only in localStorage (e.g. server insert failed) stay visible after refresh. */
function mergeRemoteWithLocalOnlyMarks(remote: WorldMemorySnapshot): WorldMemorySnapshot {
  const local = loadLocalWorldSnapshot();
  const rEcho = new Set(remote.echoes.map((e) => e.id));
  const rWish = new Set(remote.wishes.map((w) => w.id));
  const extraEchoes = local.echoes.filter((e) => !rEcho.has(e.id));
  const extraWishes = local.wishes.filter((w) => !rWish.has(w.id));
  if (extraEchoes.length === 0 && extraWishes.length === 0) return remote;
  return {
    ...remote,
    echoes: [...extraEchoes, ...remote.echoes],
    wishes: [...extraWishes, ...remote.wishes],
  };
}

export async function fetchWorldMemoryClient(): Promise<{
  snapshot: WorldMemorySnapshot;
  fromRemote: boolean;
  /** True only when server has `SUPABASE_SERVICE_ROLE_KEY` — needed for cross-device writes (echoes/wishes/photos API). */
  serverWrites: boolean;
  /** When `fromRemote` is false because the API failed, carries JSON `error` or a short diagnostic (never secrets). */
  remoteError: string | null;
}> {
  let remoteError: string | null = null;
  try {
    const res = await fetch("/api/world-memory", { cache: "no-store" });
    const raw = (await parseJson(res)) as Record<string, unknown> | null;

    if (
      res.ok &&
      raw &&
      typeof raw === "object" &&
      Array.isArray(raw.echoes) &&
      Array.isArray(raw.wishes) &&
      raw.landmark &&
      typeof raw.landmark === "object"
    ) {
      const copy = { ...raw };
      const serverWrites = copy.serverWrites === true;
      delete copy.serverWrites;
      const data = copy as WorldMemorySnapshot;
      const merged = mergeRemoteWithLocalOnlyMarks(data);
      return { snapshot: merged, fromRemote: true, serverWrites, remoteError: null };
    }

    if (!res.ok) {
      const errStr = typeof raw?.error === "string" ? raw.error.trim() : "";
      remoteError = errStr || `world-memory 不可用（HTTP ${res.status}）。`;
    } else {
      remoteError = "world-memory 返回了无法解析的数据。";
    }
  } catch {
    remoteError = "world-memory 网络异常或无法连接服务器。";
  }

  return {
    snapshot: loadLocalWorldSnapshot(),
    fromRemote: false,
    serverWrites: false,
    remoteError,
  };
}

export async function createEchoOnServer(partial: Record<string, unknown>): Promise<EchoFootprint | null> {
  let savedRemotely = false;
  try {
    const res = await fetch("/api/world-echoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ echo: partial }),
    });
    if (res.ok) {
      const j = (await parseJson(res)) as { echo?: EchoFootprint };
      if (j?.echo) {
        savedRemotely = true;
        return j.echo;
      }
    }
  } catch {
    /* network / offline */
  }
  if (!savedRemotely) {
    try {
      return createEchoLocal(partial);
    } catch {
      return null;
    }
  }
  return null;
}

export async function patchEchoOnServer(id: string, patch: Partial<EchoFootprint>): Promise<EchoFootprint | null> {
  let savedRemotely = false;
  try {
    const res = await fetch(`/api/world-echoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const j = (await parseJson(res)) as { echo?: EchoFootprint };
      if (j?.echo) {
        savedRemotely = true;
        return j.echo;
      }
    }
  } catch {
    /* network / offline */
  }
  if (!savedRemotely) return patchEchoLocal(id, patch);
  return null;
}

export async function deleteEchoOnServer(id: string): Promise<boolean> {
  let deletedRemotely = false;
  try {
    const res = await fetch(`/api/world-echoes/${id}`, { method: "DELETE" });
    if (res.ok) {
      deletedRemotely = true;
      deleteEchoLocal(id);
      return true;
    }
  } catch {
    /* network / offline */
  }
  if (!deletedRemotely) return deleteEchoLocal(id);
  return false;
}

export async function createWishOnServer(partial: Record<string, unknown>): Promise<VisionDream | null> {
  let savedRemotely = false;
  try {
    const res = await fetch("/api/world-wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish: partial }),
    });
    if (res.ok) {
      const j = (await parseJson(res)) as { wish?: VisionDream };
      if (j?.wish) {
        savedRemotely = true;
        return j.wish;
      }
    }
  } catch {
    /* network / offline */
  }
  if (!savedRemotely) {
    try {
      return createWishLocal(partial);
    } catch {
      return null;
    }
  }
  return null;
}

export async function patchWishOnServer(id: string, patch: Partial<VisionDream>): Promise<VisionDream | null> {
  let savedRemotely = false;
  try {
    const res = await fetch(`/api/world-wishes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const j = (await parseJson(res)) as { wish?: VisionDream };
      if (j?.wish) {
        savedRemotely = true;
        return j.wish;
      }
    }
  } catch {
    /* network / offline */
  }
  if (!savedRemotely) return patchWishLocal(id, patch);
  return null;
}

export async function deleteWishOnServer(id: string): Promise<boolean> {
  let deletedRemotely = false;
  try {
    const res = await fetch(`/api/world-wishes/${id}`, { method: "DELETE" });
    if (res.ok) {
      deletedRemotely = true;
      deleteWishLocal(id);
      return true;
    }
  } catch {
    /* network / offline */
  }
  if (!deletedRemotely) return deleteWishLocal(id);
  return false;
}

/** 将未竟 Wish 迁入拾遗 Echo：创建回声后删除原心愿（含日记并入 memoryObjects）。 */
export async function convertWishToTraceOnServer(
  wish: VisionDream,
  gallery: string[],
  memoryObjects: MemoryObject[],
): Promise<EchoFootprint | null> {
  const mergedGallery = gallery.length > 0 ? gallery : wish.gallery;
  const objs: MemoryObject[] = [...memoryObjects];
  const diary = wish.diary?.trim();
  if (
    diary &&
    !objs.some((o) => o.type === "text" && o.content.trim() === diary)
  ) {
    objs.unshift({
      type: "text",
      id: `wish-diary-${wish.id}`,
      createdAt: new Date().toISOString(),
      content: diary,
      noteStyle: "journal",
    });
  }
  const echo = await createEchoOnServer({
    query: wish.query,
    displayName: wish.displayName,
    lat: wish.lat,
    lng: wish.lng,
    createdAt: wish.createdAt,
    gallery: mergedGallery,
    audioUrl: wish.audioUrl,
    voiceNoteUrl: wish.voiceNoteUrl,
    recordedDate: wish.recordedDate,
    linkUrl: wish.linkUrl,
    author: wish.author,
    memoryObjects: objs,
  });
  if (!echo) return null;
  await deleteWishOnServer(wish.id);
  return echo;
}

export async function patchEternalOnServer(patch: Partial<EternalWorldState>): Promise<EternalWorldState | null> {
  const res = await fetch("/api/world-eternal", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { eternal?: EternalWorldState };
  return j.eternal ?? null;
}

export async function createTimelineEntryOnServer(entry: {
  content: string;
  date: string;
  memoryId?: string | null;
}): Promise<TimelineEntryView | null> {
  const res = await fetch("/api/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { item?: TimelineEntryView };
  return j.item ?? null;
}

export async function patchTimelineEntryOnServer(
  id: string,
  patch: Partial<{ content: string; date: string; memoryId: string | null }>,
): Promise<TimelineEntryView | null> {
  const res = await fetch(`/api/timeline/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { item?: TimelineEntryView };
  return j.item ?? null;
}

export async function deleteTimelineEntryOnServer(id: string): Promise<boolean> {
  const res = await fetch(`/api/timeline/${id}`, { method: "DELETE" });
  return res.ok;
}

export type UploadedWorldMedia = {
  url: string;
  mimeType?: string;
  storagePath?: string;
};

export type WorldMediaUploadResult =
  | { ok: true; meta: UploadedWorldMedia }
  | { ok: false; error: string };

function mimeGuessFromFileName(name: string): string | null {
  const n = name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".avif")) return "image/avif";
  if (n.endsWith(".bmp")) return "image/bmp";
  if (n.endsWith(".tif") || n.endsWith(".tiff")) return "image/tiff";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".heic")) return "image/heic";
  if (n.endsWith(".heif")) return "image/heif";
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  if (n.endsWith(".mov")) return "video/quicktime";
  if (n.endsWith(".m4a")) return "audio/mp4";
  if (n.endsWith(".mp3")) return "audio/mpeg";
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".ogg")) return "audio/ogg";
  return null;
}

function effectiveMime(file: File): string {
  const t = file.type?.trim();
  if (t) return t;
  const g = file.name ? mimeGuessFromFileName(file.name) : null;
  return g ?? "application/octet-stream";
}

function sanitizeFileStem(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\.[^/.]+$/, "");
  const s = base.trim() || "file";
  return s.length > 64 ? s.slice(0, 64) : s;
}

function buildUniqueWorldStoragePath(file: File, mime: string): string {
  const ext = extForWorldMime(mime);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const stem = sanitizeFileStem(file.name || "upload");
  return `world/${Date.now()}-${id}-${stem}.${ext}`;
}

function humanizeStorageUploadError(raw: string): string {
  const m = raw.trim() || "上传失败";
  if (/payload too large|FUNCTION_PAYLOAD_TOO_LARGE|413/i.test(m)) {
    return "上传体积超过限制（若仍经边缘代理，请检查单文件上限；直连 Storage 后一般可达项目配额）。";
  }
  if (/invalid.*jwt|malformed.*jwt|Invalid API key|invalid api key|apikey|Unauthorized/i.test(m)) {
    return "Supabase 公钥无效：请在 Dashboard → Settings → API 复制「anon public」密钥，写入 NEXT_PUBLIC_SUPABASE_ANON_KEY 后重新部署。";
  }
  if (/bucket|not found|NoSuchBucket|does not exist/i.test(m)) {
    return `Storage 中找不到 bucket「${getWorldPublicStorageBucket()}」。请在 Supabase 创建同名 bucket，或设置 NEXT_PUBLIC_STORAGE_BUCKET（需与 SUPABASE_STORAGE_BUCKET 一致）。`;
  }
  if (/row-level security|RLS|permission|policy|not authorized|403/i.test(m)) {
    return "没有写入该 Storage 的权限：请在 Supabase → Storage → 对应 bucket → Policies 为 anon 添加 INSERT（公开上传时常见）。";
  }
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(m)) {
    return "连接 Storage 超时或网络中断，请稍后重试。";
  }
  return m;
}

async function uploadWorldMediaViaSupabaseStorage(
  file: File,
  mime: string,
): Promise<{ ok: true; meta: UploadedWorldMedia } | { ok: false; error: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "上传仅能在浏览器中执行。" };
  }
  if (!hasSupabaseBrowserConfig()) {
    return { ok: false, error: "未配置 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，无法直连 Storage。" };
  }
  try {
    const supabase = getSupabaseBrowser();
    const bucket = getWorldPublicStorageBucket();
    const storagePath = buildUniqueWorldStoragePath(file, mime);
    const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
      contentType: mime,
      upsert: false,
      cacheControl: "3600",
    });
    if (error) {
      return { ok: false, error: humanizeStorageUploadError(error.message ?? String(error)) };
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const url = pub.publicUrl?.trim() ?? "";
    if (!url.startsWith("http")) {
      return {
        ok: false,
        error: "已上传但未得到可用的公开 URL：请将该 bucket 设为 Public，或配置公开访问策略。",
      };
    }
    return { ok: true, meta: { url, storagePath, mimeType: mime } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: humanizeStorageUploadError(msg) };
  }
}

/** When Storage upload fails, embed file as data URL (local-only; mind localStorage quota). */
function localDataUrlMaxForMime(mime: string): number {
  if (mime.startsWith("image/")) return 6 * 1024 * 1024;
  if (mime.startsWith("audio/")) return 5 * 1024 * 1024;
  if (mime.startsWith("video/")) return 2_400_000;
  return 2_400_000;
}

async function readFileAsDataUrlLimited(file: File, mime: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const max = localDataUrlMaxForMime(mime);
  if (file.size > max) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload to Supabase Storage from the browser (bypasses Vercel body limits).
 * On failure, tries a small-file data URL fallback when allowed.
 */
export async function uploadWorldMediaWithMetaResult(file: File): Promise<WorldMediaUploadResult> {
  const mime = effectiveMime(file);
  if (!WORLD_UPLOAD_MIMES.has(mime)) {
    return {
      ok: false,
      error: `不支持的文件类型「${mime}」。请使用 JPG/PNG/WebP/GIF/HEIC、常见视频或音频格式。`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `文件过大（超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB）。` };
  }

  if (hasSupabaseBrowserConfig()) {
    const direct = await uploadWorldMediaViaSupabaseStorage(file, mime);
    if (direct.ok) return direct;
    const dataUrl = await readFileAsDataUrlLimited(file, mime);
    if (dataUrl) {
      return {
        ok: true,
        meta: { url: dataUrl, mimeType: mime },
      };
    }
    return {
      ok: false,
      error: `${direct.error} 且无法使用本机内嵌（文件过大或未配置浏览器降级）。`,
    };
  }

  const dataUrl = await readFileAsDataUrlLimited(file, mime);
  if (dataUrl) return { ok: true, meta: { url: dataUrl, mimeType: mime } };
  return {
    ok: false,
    error: "未配置 Supabase 公钥环境变量，且文件超出本机内嵌大小上限。请设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
  };
}

/** @deprecated Prefer `uploadWorldMediaWithMetaResult` when you need the error message. */
export async function uploadWorldMediaWithMeta(file: File): Promise<UploadedWorldMedia | null> {
  const r = await uploadWorldMediaWithMetaResult(file);
  return r.ok ? r.meta : null;
}

/** Returns public `https` URL from Storage, or a `data:` URL when only local fallback works. */
export async function uploadWorldMedia(file: File): Promise<string | null> {
  const r = await uploadWorldMediaWithMetaResult(file);
  return r.ok ? r.meta.url : null;
}

export async function fetchQuestPhotosClient(placeId: string, variant: QuestVariant): Promise<QuestPhotoRecord[]> {
  try {
    const res = await fetch(
      `/api/quest-photos?placeId=${encodeURIComponent(placeId)}&variant=${encodeURIComponent(variant)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const j = (await parseJson(res)) as { photos?: QuestPhotoRecord[] };
    return Array.isArray(j.photos) ? j.photos : [];
  } catch {
    return [];
  }
}

export async function deleteQuestPhotoClient(photoId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/quest-photos?id=${encodeURIComponent(photoId)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export type QuestPhotoInsertResult =
  | { ok: true; photo: QuestPhotoRecord }
  | { ok: false; error: string };

export async function insertQuestPhotoClientResult(payload: {
  questVariant: QuestVariant;
  worldPlaceId: string;
  placeQuery: string;
  lat: number;
  lng: number;
  publicUrl: string;
  storagePath: string;
  mimeType: string;
  mediaType: "image" | "video";
  bytes: number;
  caption: string;
  authorName: string;
  authorAvatar?: string | null;
}): Promise<QuestPhotoInsertResult> {
  try {
    const res = await fetch("/api/quest-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await parseJson(res)) as { photo?: QuestPhotoRecord; error?: string; hint?: string };
    if (!res.ok) {
      const msg =
        typeof j?.error === "string" && j.error.trim() ? j.error.trim() : `写入相册失败（HTTP ${res.status}）`;
      const hint = typeof j?.hint === "string" && j.hint.trim() ? ` ${j.hint.trim()}` : "";
      return { ok: false, error: msg + hint };
    }
    if (j.photo) return { ok: true, photo: j.photo };
    return { ok: false, error: "服务器未返回照片记录。" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "网络异常" };
  }
}

export async function insertQuestPhotoClient(payload: {
  questVariant: QuestVariant;
  worldPlaceId: string;
  placeQuery: string;
  lat: number;
  lng: number;
  publicUrl: string;
  storagePath: string;
  mimeType: string;
  mediaType: "image" | "video";
  bytes: number;
  caption: string;
  authorName: string;
  authorAvatar?: string | null;
}): Promise<QuestPhotoRecord | null> {
  const r = await insertQuestPhotoClientResult(payload);
  return r.ok ? r.photo : null;
}

export async function patchMemoryObjectsOnServer(
  variant: "echo" | "wish",
  id: string,
  memoryObjects: MemoryObject[],
): Promise<EchoFootprint | VisionDream | null> {
  if (variant === "echo") {
    return patchEchoOnServer(id, { memoryObjects });
  }
  return patchWishOnServer(id, { memoryObjects });
}
