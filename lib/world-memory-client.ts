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

export async function fetchWorldMemoryClient(): Promise<WorldMemorySnapshot | null> {
  if (!isCloudGalleryClient()) {
    return loadLocalWorldSnapshot();
  }
  const res = await fetch("/api/world-memory", { cache: "no-store" });
  if (!res.ok) return null;
  return (await parseJson(res)) as WorldMemorySnapshot;
}

export async function createEchoOnServer(partial: Record<string, unknown>): Promise<EchoFootprint | null> {
  if (!isCloudGalleryClient()) {
    try {
      return createEchoLocal(partial);
    } catch {
      return null;
    }
  }
  const res = await fetch("/api/world-echoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ echo: partial }),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { echo?: EchoFootprint };
  return j.echo ?? null;
}

export async function patchEchoOnServer(id: string, patch: Partial<EchoFootprint>): Promise<EchoFootprint | null> {
  if (!isCloudGalleryClient()) {
    return patchEchoLocal(id, patch);
  }
  const res = await fetch(`/api/world-echoes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { echo?: EchoFootprint };
  return j.echo ?? null;
}

export async function deleteEchoOnServer(id: string): Promise<boolean> {
  if (!isCloudGalleryClient()) {
    return deleteEchoLocal(id);
  }
  const res = await fetch(`/api/world-echoes/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function createWishOnServer(partial: Record<string, unknown>): Promise<VisionDream | null> {
  if (!isCloudGalleryClient()) {
    try {
      return createWishLocal(partial);
    } catch {
      return null;
    }
  }
  const res = await fetch("/api/world-wishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wish: partial }),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { wish?: VisionDream };
  return j.wish ?? null;
}

export async function patchWishOnServer(id: string, patch: Partial<VisionDream>): Promise<VisionDream | null> {
  if (!isCloudGalleryClient()) {
    return patchWishLocal(id, patch);
  }
  const res = await fetch(`/api/world-wishes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { wish?: VisionDream };
  return j.wish ?? null;
}

export async function deleteWishOnServer(id: string): Promise<boolean> {
  if (!isCloudGalleryClient()) {
    return deleteWishLocal(id);
  }
  const res = await fetch(`/api/world-wishes/${id}`, { method: "DELETE" });
  return res.ok;
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
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/world-upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  const j = (await parseJson(res)) as { url?: string };
  return typeof j.url === "string" && j.url.startsWith("http") ? j.url : null;
}
