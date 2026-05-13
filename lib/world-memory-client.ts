"use client";

import { isCloudGalleryClient } from "@/lib/gallery-cloud-config";
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
import type { EternalWorldState, TimelineEntryView, WorldMemorySnapshot } from "@/lib/world-memory-types";

async function parseJson(res: Response): Promise<unknown> {
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/** When Supabase is not configured on the server (503) or the network fails, still persist to localStorage so the map works on this device. */
function shouldPersistEchoWishLocally(lastStatus: number): boolean {
  if (!isCloudGalleryClient()) return true;
  return lastStatus === 0 || lastStatus === 502 || lastStatus === 503 || lastStatus === 504;
}

export async function fetchWorldMemoryClient(): Promise<{ snapshot: WorldMemorySnapshot; fromRemote: boolean }> {
  try {
    const res = await fetch("/api/world-memory", { cache: "no-store" });
    if (res.ok) {
      const data = (await parseJson(res)) as WorldMemorySnapshot | null;
      if (data && typeof data === "object" && Array.isArray(data.echoes) && Array.isArray(data.wishes)) {
        return { snapshot: data, fromRemote: true };
      }
    }
  } catch {
    /* offline or CORS */
  }
  return { snapshot: loadLocalWorldSnapshot(), fromRemote: false };
}

export async function createEchoOnServer(partial: Record<string, unknown>): Promise<EchoFootprint | null> {
  let lastStatus = -1;
  try {
    const res = await fetch("/api/world-echoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ echo: partial }),
    });
    lastStatus = res.status;
    if (res.ok) {
      const j = (await parseJson(res)) as { echo?: EchoFootprint };
      return j.echo ?? null;
    }
  } catch {
    lastStatus = 0;
  }
  if (shouldPersistEchoWishLocally(lastStatus)) {
    try {
      return createEchoLocal(partial);
    } catch {
      return null;
    }
  }
  return null;
}

export async function patchEchoOnServer(id: string, patch: Partial<EchoFootprint>): Promise<EchoFootprint | null> {
  let lastStatus = -1;
  try {
    const res = await fetch(`/api/world-echoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    lastStatus = res.status;
    if (res.ok) {
      const j = (await parseJson(res)) as { echo?: EchoFootprint };
      return j.echo ?? null;
    }
  } catch {
    lastStatus = 0;
  }
  if (shouldPersistEchoWishLocally(lastStatus)) return patchEchoLocal(id, patch);
  return null;
}

export async function deleteEchoOnServer(id: string): Promise<boolean> {
  let lastStatus = -1;
  try {
    const res = await fetch(`/api/world-echoes/${id}`, { method: "DELETE" });
    lastStatus = res.status;
    if (res.ok) return true;
  } catch {
    lastStatus = 0;
  }
  if (shouldPersistEchoWishLocally(lastStatus)) return deleteEchoLocal(id);
  return false;
}

export async function createWishOnServer(partial: Record<string, unknown>): Promise<VisionDream | null> {
  let lastStatus = -1;
  try {
    const res = await fetch("/api/world-wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish: partial }),
    });
    lastStatus = res.status;
    if (res.ok) {
      const j = (await parseJson(res)) as { wish?: VisionDream };
      return j.wish ?? null;
    }
  } catch {
    lastStatus = 0;
  }
  if (shouldPersistEchoWishLocally(lastStatus)) {
    try {
      return createWishLocal(partial);
    } catch {
      return null;
    }
  }
  return null;
}

export async function patchWishOnServer(id: string, patch: Partial<VisionDream>): Promise<VisionDream | null> {
  let lastStatus = -1;
  try {
    const res = await fetch(`/api/world-wishes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    lastStatus = res.status;
    if (res.ok) {
      const j = (await parseJson(res)) as { wish?: VisionDream };
      return j.wish ?? null;
    }
  } catch {
    lastStatus = 0;
  }
  if (shouldPersistEchoWishLocally(lastStatus)) return patchWishLocal(id, patch);
  return null;
}

export async function deleteWishOnServer(id: string): Promise<boolean> {
  let lastStatus = -1;
  try {
    const res = await fetch(`/api/world-wishes/${id}`, { method: "DELETE" });
    lastStatus = res.status;
    if (res.ok) return true;
  } catch {
    lastStatus = 0;
  }
  if (shouldPersistEchoWishLocally(lastStatus)) return deleteWishLocal(id);
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

/** Upload image or audio to Supabase Storage; returns public HTTPS URL. Without cloud, returns a data URL for this browser only (localStorage). */
export async function uploadWorldMedia(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/world-upload", { method: "POST", body: fd });
    if (res.ok) {
      const j = (await parseJson(res)) as { url?: string };
      const u = j.url;
      if (typeof u === "string" && u.startsWith("http")) return u;
    }
  } catch {
    /* */
  }
  if (!isCloudGalleryClient()) {
    if (typeof window === "undefined") return null;
    const max = 2_400_000;
    if (file.size > max) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
  return null;
}

export type UploadedWorldMedia = {
  url: string;
  mimeType?: string;
  storagePath?: string;
};

export async function uploadWorldMediaWithMeta(file: File): Promise<UploadedWorldMedia | null> {
  try {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/world-upload", { method: "POST", body: fd });
    if (res.ok) {
      const j = (await parseJson(res)) as { url?: string; mimeType?: string; storagePath?: string };
      const u = typeof j.url === "string" ? j.url.trim() : "";
      if (u.startsWith("http") || u.startsWith("data:")) {
        return {
          url: u,
          mimeType: typeof j.mimeType === "string" ? j.mimeType : undefined,
          storagePath: typeof j.storagePath === "string" ? j.storagePath : undefined,
        };
      }
    }
  } catch {
    /* */
  }
  const fallbackUrl = await uploadWorldMedia(file);
  if (!fallbackUrl) return null;
  return { url: fallbackUrl, mimeType: file.type || undefined };
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
  try {
    const res = await fetch("/api/quest-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await parseJson(res)) as { photo?: QuestPhotoRecord };
    return j.photo ?? null;
  } catch {
    return null;
  }
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
