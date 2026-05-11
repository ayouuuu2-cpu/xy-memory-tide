"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  onComplete: () => void;
};

const DURATION = 1.5;
const TRAIL_COUNT = 10;

/**
 * Glowing star flies upward with a faint stardust trail; unmounts after animation.
 */
export function AscendingStar({ start, end, onComplete }: Props) {
  const trail = useMemo(
    () =>
      Array.from({ length: TRAIL_COUNT }, (_, i) => ({
        delay: (i / TRAIL_COUNT) * 0.22,
        scale: 0.35 + (i / TRAIL_COUNT) * 0.45,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[155]" aria-hidden>
      {trail.map((t, i) => (
        <motion.div
          key={`trail-${i}`}
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200/90 to-fuchsia-300/70 shadow-[0_0_8px_rgba(255,230,200,0.85)]"
          initial={{ left: start.x, top: start.y, opacity: 0.55, scale: t.scale * 0.6 }}
          animate={{
            left: end.x,
            top: end.y,
            opacity: [0.55, 0.25, 0],
            scale: t.scale * 0.3,
          }}
          transition={{
            duration: DURATION,
            delay: t.delay,
            ease: [0.22, 0.65, 0.36, 1],
          }}
        />
      ))}

      <motion.div
        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-100 via-fuchsia-200 to-violet-300 shadow-[0_0_22px_rgba(255,220,255,0.95),0_0_40px_rgba(200,160,255,0.5)]"
        initial={{ left: start.x, top: start.y, scale: 0.65, opacity: 1 }}
        animate={{
          left: end.x,
          top: end.y,
          scale: [0.65, 1.15, 1, 0.85],
          opacity: [1, 1, 0.95, 0],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: DURATION, ease: [0.2, 0.55, 0.34, 1] }}
        onAnimationComplete={onComplete}
      />
    </div>
  );
}
