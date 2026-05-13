"use client";

import type { LandmarkMemory } from "@/data/memories";

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Browser: fetch Yunnan landmark bundle from Next API (Supabase-backed when configured). */
export async function fetchMemoryHubLandmark(): Promise<LandmarkMemory | null> {
  try {
    const res = await fetch("/api/memory-hub", { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const body = (await parseJsonResponse(res)) as { landmark?: LandmarkMemory } | null;
    const landmark = body && typeof body === "object" && body.landmark ? body.landmark : null;
    if (!landmark || landmark.id !== "yunnan") return null;
    return landmark;
  } catch {
    return null;
  }
}

export async function saveMemoryHubLandmark(landmark: LandmarkMemory): Promise<boolean> {
  if (landmark.id !== "yunnan") return false;
  try {
    const res = await fetch("/api/memory-hub", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landmark }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
