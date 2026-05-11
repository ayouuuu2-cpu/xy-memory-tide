"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Ctx = {
  isPlaying: boolean;
  /** Smoothed 0–1 from analyser (or 0). */
  volume: number;
  /** Call from WhisperPlayer when starting playback with analyser tick. */
  setPlaying: (playing: boolean) => void;
  setVolumeFrame: (v: number) => void;
};

const WhisperPlaybackContext = createContext<Ctx | null>(null);

export function WhisperPlaybackProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const smoothRef = useRef(0);

  const setPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    if (!playing) {
      smoothRef.current = 0;
      setVolume(0);
    }
  }, []);

  const setVolumeFrame = useCallback((v: number) => {
    const s = smoothRef.current * 0.82 + v * 0.18;
    smoothRef.current = s;
    setVolume(s);
  }, []);

  const value = useMemo(
    () => ({ isPlaying, volume, setPlaying, setVolumeFrame }),
    [isPlaying, volume, setPlaying, setVolumeFrame],
  );

  return <WhisperPlaybackContext.Provider value={value}>{children}</WhisperPlaybackContext.Provider>;
}

export function useWhisperPlayback(): Ctx {
  const ctx = useContext(WhisperPlaybackContext);
  if (!ctx) {
    return {
      isPlaying: false,
      volume: 0,
      setPlaying: () => {},
      setVolumeFrame: () => {},
    };
  }
  return ctx;
}
