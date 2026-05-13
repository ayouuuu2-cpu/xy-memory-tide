"use client";

import { useWorldMemory } from "@/contexts/WorldMemoryContext";

/** Surfaces `/api/world-memory` failure reason when the app falls back to local snapshot. */
export function WorldMemoryFetchErrorBanner() {
  const { worldMemoryFetchError, worldMemoryRemote } = useWorldMemory();
  if (worldMemoryRemote || !worldMemoryFetchError) return null;

  return (
    <div
      role="alert"
      className="border-b border-rose-800/70 bg-rose-950/95 px-3 py-2 text-center text-[12px] leading-snug text-rose-100"
    >
      <p className="mx-auto max-h-28 max-w-4xl overflow-y-auto break-words">
        <span className="font-medium text-rose-50">世界记忆同步失败：</span>
        {worldMemoryFetchError}
      </p>
    </div>
  );
}
