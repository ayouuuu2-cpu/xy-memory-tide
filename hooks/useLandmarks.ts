"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandmarkMemory, MemoryImage } from "@/data/memories";
import {
  loadLandmarksFromStorage,
  mergeLandmarkData,
  saveLandmarksToStorage,
} from "@/lib/landmark-storage";

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useLandmarks() {
  const [landmarks, setLandmarks] = useState<LandmarkMemory[]>(() => mergeLandmarkData(null));
  const skipSaveOnce = useRef(true);

  useEffect(() => {
    queueMicrotask(() => {
      setLandmarks(loadLandmarksFromStorage());
    });
  }, []);

  useEffect(() => {
    if (skipSaveOnce.current) {
      skipSaveOnce.current = false;
      return;
    }
    saveLandmarksToStorage(landmarks);
  }, [landmarks]);

  const updateLandmark = useCallback((lid: string, patch: Partial<LandmarkMemory>) => {
    if (lid !== "yunnan") return;
    setLandmarks((prev) => prev.map((l) => (l.id === lid ? { ...l, ...patch } : l)));
  }, []);

  const addImage = useCallback((lid: string, img: Omit<MemoryImage, "id">) => {
    if (lid !== "yunnan") return;
    const memoryImage: MemoryImage = { ...img, id: id("img") };
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
