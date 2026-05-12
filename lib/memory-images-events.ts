/** Fired after cloud `memory_images` rows change so hooks can refetch (e.g. `useLandmarks`). */
export const MEMORY_IMAGES_CHANGED_EVENT = "memory-tide-memory-images-changed";

export function announceMemoryImagesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MEMORY_IMAGES_CHANGED_EVENT));
}
