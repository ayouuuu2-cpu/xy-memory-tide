import type { WorldMemorySnapshot } from "@/lib/world-memory-types";

let published: WorldMemorySnapshot | null = null;

export function publishWorldMemorySnapshot(snapshot: WorldMemorySnapshot | null): void {
  published = snapshot;
}

export function getPublishedWorldMemorySnapshot(): WorldMemorySnapshot | null {
  return published;
}
