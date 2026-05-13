"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandmarkMemory, MemoryImage } from "@/data/memories";
import { mergeLandmarkData } from "@/lib/landmark-storage";
import { saveMemoryHubLandmark } from "@/lib/memory-core-cloud";
import { useWorldMemory } from "@/contexts/WorldMemoryContext";

function newClientImageId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}`;
}

export function useLandmarks() {
  const { snapshot, refresh, worldMemoryRemote } = useWorldMemory();
  const [landmarks, setLandmarks] = useState<LandmarkMemory[]>(() => mergeLandmarkData(null));
  const skipSaveOnce = useRef(true);

  useEffect(() => {
    queueMicrotask(() => {
      if (snapshot?.landmark) {
        setLandmarks(mergeLandmarkData([snapshot.landmark]));
      } else {
        setLandmarks(mergeLandmarkData(null));
      }
    });
  }, [snapshot]);

  useEffect(() => {
    if (skipSaveOnce.current) {
      skipSaveOnce.current = false;
      return;
    }
    if (!worldMemoryRemote) return;
    const yunnan = landmarks.find((l) => l.id === "yunnan");
    if (!yunnan) return;
    void saveMemoryHubLandmark(yunnan).then(async (ok) => {
      if (ok) await refresh();
    });
  }, [landmarks, refresh, worldMemoryRemote]);

  const updateLandmark = useCallback((lid: string, patch: Partial<LandmarkMemory>) => {
    if (lid !== "yunnan") return;
    setLandmarks((prev) => prev.map((l) => (l.id === lid ? { ...l, ...patch } : l)));
  }, []);

  const addImage = useCallback((lid: string, img: Omit<MemoryImage, "id">) => {
    if (lid !== "yunnan") return;
    const memoryImage: MemoryImage = { ...img, id: newClientImageId() };
    setLandmarks((prev) =>
      prev.map((l) =>
        l.id === lid ? { ...l, images: [...l.images, memoryImage] } : l,
      ),
    );
  }, []);

  const updateImageCaption = useCallback((lid: string, imageId: string, caption: string) => {
    if (lid !== "yunnan") return;
    setLandmarks((prev) =>
      prev.map((l) =>
        l.id === lid
          ? {
              ...l,
              images: l.images.map((im) =>
                im.id === imageId ? { ...im, caption } : im,
              ),
            }
          : l,
      ),
    );
  }, []);

  const removeImage = useCallback((lid: string, imageId: string) => {
    if (lid !== "yunnan") return;
    setLandmarks((prev) =>
      prev.map((l) =>
        l.id === lid
          ? { ...l, images: l.images.filter((im) => im.id !== imageId) }
          : l,
      ),
    );
  }, []);

  const updateTexts = useCallback(
    (lid: string, texts: string[]) => {
      updateLandmark(lid, { texts });
    },
    [updateLandmark],
  );

  return {
    landmarks,
    setLandmarks,
    updateLandmark,
    addImage,
    updateImageCaption,
    removeImage,
    updateTexts,
  };
}
