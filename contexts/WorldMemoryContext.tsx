"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isCloudGalleryClient } from "@/lib/gallery-cloud-config";
import { MEMORY_IMAGES_CHANGED_EVENT } from "@/lib/memory-images-events";
import { publishWorldMemorySnapshot } from "@/lib/world-memory-cache";
import { fetchWorldMemoryClient } from "@/lib/world-memory-client";
import type { WorldMemorySnapshot } from "@/lib/world-memory-types";

type WorldMemoryContextValue = {
  ready: boolean;
  snapshot: WorldMemorySnapshot | null;
  refresh: () => Promise<void>;
};

const WorldMemoryContext = createContext<WorldMemoryContextValue | null>(null);

export function WorldMemoryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<WorldMemorySnapshot | null>(null);

  const refresh = useCallback(async () => {
    if (!isCloudGalleryClient()) {
      const local = await fetchWorldMemoryClient();
      setSnapshot(local);
      publishWorldMemorySnapshot(local);
      setReady(true);
      return;
    }
    const s = await fetchWorldMemoryClient();
    setSnapshot(s);
    publishWorldMemorySnapshot(s);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onImages = () => {
      void refresh();
    };
    window.addEventListener(MEMORY_IMAGES_CHANGED_EVENT, onImages);
    return () => window.removeEventListener(MEMORY_IMAGES_CHANGED_EVENT, onImages);
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
      snapshot,
      refresh,
    }),
    [ready, snapshot, refresh],
  );

  return <WorldMemoryContext.Provider value={value}>{children}</WorldMemoryContext.Provider>;
}

export function useWorldMemory(): WorldMemoryContextValue {
  const v = useContext(WorldMemoryContext);
  if (!v) {
    throw new Error("useWorldMemory must be used within WorldMemoryProvider");
  }
  return v;
}
