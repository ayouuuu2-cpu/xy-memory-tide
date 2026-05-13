"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MEMORY_IMAGES_CHANGED_EVENT } from "@/lib/memory-images-events";
import { publishWorldMemorySnapshot } from "@/lib/world-memory-cache";
import { fetchWorldMemoryClient } from "@/lib/world-memory-client";
import { cacheWorldMemorySnapshotFromRemote } from "@/lib/world-memory-local";
import type { WorldMemorySnapshot } from "@/lib/world-memory-types";

type WorldMemoryContextValue = {
  ready: boolean;
  snapshot: WorldMemorySnapshot | null;
  /** True when `/api/world-memory` returned 200 (Supabase-backed aggregate). */
  worldMemoryRemote: boolean;
  /** True when server has Service Role — `/api/world-echoes` etc. can persist cross-device. */
  worldMemoryServerWrites: boolean;
  /** Populated when the last refresh could not load remote snapshot (HTTP error / parse). */
  worldMemoryFetchError: string | null;
  refresh: () => Promise<void>;
};

const WorldMemoryContext = createContext<WorldMemoryContextValue | null>(null);

const IMAGE_REFRESH_DEBOUNCE_MS = 320;

export function WorldMemoryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<WorldMemorySnapshot | null>(null);
  const [worldMemoryRemote, setWorldMemoryRemote] = useState(false);
  const [worldMemoryServerWrites, setWorldMemoryServerWrites] = useState(false);
  const [worldMemoryFetchError, setWorldMemoryFetchError] = useState<string | null>(null);
  const imageRefreshTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const { snapshot: next, fromRemote, serverWrites, remoteError } = await fetchWorldMemoryClient();
    setSnapshot(next);
    setWorldMemoryRemote(fromRemote);
    setWorldMemoryServerWrites(serverWrites);
    setWorldMemoryFetchError(fromRemote ? null : remoteError);
    publishWorldMemorySnapshot(next);
    if (fromRemote) cacheWorldMemorySnapshotFromRemote(next);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void refresh();
    };
    if (typeof window.requestIdleCallback === "function") {
      const rid = window.requestIdleCallback(run, { timeout: 600 });
      return () => {
        cancelled = true;
        if (typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(rid);
        }
      };
    }
    const tid = window.setTimeout(run, 32);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [refresh]);

  useEffect(() => {
    const onImages = () => {
      if (imageRefreshTimerRef.current !== null) window.clearTimeout(imageRefreshTimerRef.current);
      imageRefreshTimerRef.current = window.setTimeout(() => {
        imageRefreshTimerRef.current = null;
        void refresh();
      }, IMAGE_REFRESH_DEBOUNCE_MS);
    };
    window.addEventListener(MEMORY_IMAGES_CHANGED_EVENT, onImages);
    return () => {
      window.removeEventListener(MEMORY_IMAGES_CHANGED_EVENT, onImages);
      if (imageRefreshTimerRef.current !== null) window.clearTimeout(imageRefreshTimerRef.current);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
      snapshot,
      worldMemoryRemote,
      worldMemoryServerWrites,
      worldMemoryFetchError,
      refresh,
    }),
    [ready, snapshot, worldMemoryRemote, worldMemoryServerWrites, worldMemoryFetchError, refresh],
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
