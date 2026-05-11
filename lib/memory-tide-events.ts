/** Dispatched after a new Trace/Wish pin is saved from the mark bar (not from editing an existing card). */

export const MEMORY_TIDE_MARK_SUCCESS = "memory-tide:mark-success";

export function dispatchMarkSuccess(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEMORY_TIDE_MARK_SUCCESS));
}
