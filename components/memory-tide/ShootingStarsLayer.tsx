"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShootingStarStreak, type ShootingStar } from "@/components/intro/ShootingStarStreak";

function nextDelayMs() {
  return 8000 + Math.random() * 4000;
}

function spawnShootingStar(id: number): ShootingStar {
  const r = Math.random();
  let leftPct: number;
  let topPct: number;
  let angleDeg: number;

  /* Bias: steep top-right → bottom-left (~60° from horizontal ≈ 120° from +X, y-down). */
  if (r < 0.72) {
    leftPct = 54 + Math.random() * 46;
    topPct = -8 + Math.random() * 32;
    angleDeg = 108 + Math.random() * 26;
  } else if (r < 0.88) {
    leftPct = 40 + Math.random() * 55;
    topPct = -4 + Math.random() * 22;
    angleDeg = 118 + Math.random() * 22;
  } else {
    leftPct = 28 + Math.random() * 68;
    topPct = -6 + Math.random() * 26;
    angleDeg = 100 + Math.random() * 38;
  }

  return {
    id,
    leftPct,
    topPct,
    angleDeg,
    tailLen: 88 + Math.random() * 200,
    durationSec: 0.34 + Math.random() * 0.36,
    travelMult: 1.02 + Math.random() * 0.52,
  };
}

/**
 * Background-only meteors: scheduled in JS with random corners / angles.
 * Lives inside MemoryTideBackground above gradients, below page UI.
 */
export function ShootingStarsLayer() {
  const [stars, setStars] = useState<ShootingStar[]>([]);
  const idRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const schedule = useCallback(() => {
    if (typeof window === "undefined") return;
    timerRef.current = window.setTimeout(() => {
      const id = ++idRef.current;
      setStars((prev) => [...prev, spawnShootingStar(id)]);
      schedule();
    }, nextDelayMs());
  }, []);

  useEffect(() => {
    schedule();
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [schedule]);

  const onDone = useCallback((id: number) => {
    setStars((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-transparent" aria-hidden>
      <AnimatePresence>
        {stars.map((s) => (
          <ShootingStarStreak key={s.id} star={s} onDone={() => onDone(s.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
