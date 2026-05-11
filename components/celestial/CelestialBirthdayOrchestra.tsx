"use client";

import { useEffect, useRef, useState } from "react";
import { useCelestial } from "@/contexts/CelestialContext";
import { useWhisperPlayback } from "@/contexts/WhisperPlaybackContext";
import { findBirthdayWhisperUrl } from "@/lib/eternal-days";
import { PixelConfettiBurst } from "./PixelConfettiBurst";

const SESSION_KEY = "memory-tide-celestial-birthday-played";

/**
 * One-shot confetti + optional Whisper auto-play on Virgo / Scorpio celestial days.
 * Browsers may block autoplay without prior gesture — we still attempt once.
 */
export function CelestialBirthdayOrchestra() {
  const { celestialBirthday } = useCelestial();
  const { setPlaying, setVolumeFrame } = useWhisperPlayback();
  const [showConfetti, setShowConfetti] = useState(false);
  const audioOnceRef = useRef(false);

  useEffect(() => {
    if (!celestialBirthday || typeof window === "undefined") return;
    const dayKey = `${celestialBirthday}-${new Date().getFullYear()}`;
    if (sessionStorage.getItem(SESSION_KEY) === dayKey) return;

    let cancelled = false;
    setShowConfetti(true);
    const hideConfetti = window.setTimeout(() => setShowConfetti(false), 2600);
    const markSeen = window.setTimeout(() => {
      if (!cancelled) sessionStorage.setItem(SESSION_KEY, dayKey);
    }, 2800);

    const url = findBirthdayWhisperUrl(celestialBirthday);
    let playTimer: number | undefined;
    if (url && !audioOnceRef.current) {
      audioOnceRef.current = true;
      playTimer = window.setTimeout(() => {
        if (cancelled) return;
        const el = new Audio(url);
        el.addEventListener("play", () => {
          setPlaying(true);
          setVolumeFrame(0.28);
        });
        el.addEventListener("ended", () => {
          setPlaying(false);
          setVolumeFrame(0);
        });
        el.addEventListener("pause", () => {
          setPlaying(false);
          setVolumeFrame(0);
        });
        void el.play().catch(() => {
          setPlaying(false);
          setVolumeFrame(0);
        });
      }, 420);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(hideConfetti);
      window.clearTimeout(markSeen);
      if (playTimer != null) window.clearTimeout(playTimer);
    };
  }, [celestialBirthday, setPlaying, setVolumeFrame]);

  if (!celestialBirthday) return null;

  return <PixelConfettiBurst active={showConfetti} />;
}
