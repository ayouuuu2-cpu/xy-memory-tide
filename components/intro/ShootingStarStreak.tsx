"use client";

import { motion } from "framer-motion";

export type ShootingStar = {
  id: number;
  leftPct: number;
  topPct: number;
  /** Degrees from +X axis; motion follows this heading. */
  angleDeg: number;
  /** Approx px length of the bright tail. */
  tailLen: number;
  durationSec: number;
  /** Scales travel distance vs tail length (path variance). */
  travelMult: number;
};

export function ShootingStarStreak({ star, onDone }: { star: ShootingStar; onDone: () => void }) {
  const rad = (star.angleDeg * Math.PI) / 180;
  const dist = star.tailLen * star.travelMult;
  const dx = Math.cos(rad) * dist;
  const dy = Math.sin(rad) * dist;

  return (
    <motion.div
      className="pointer-events-none absolute z-0"
      style={{
        left: `${star.leftPct}%`,
        top: `${star.topPct}%`,
        width: star.tailLen,
        height: 1,
        maxHeight: 1,
        borderRadius: 0,
        transformOrigin: "50% 50%",
        background:
          "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 15%, rgba(255,255,255,0) 100%)",
        boxShadow: "none",
        filter: "blur(0.5px) drop-shadow(0 0 3px rgba(255,255,255,0.95)) drop-shadow(0 0 6px rgba(200,220,255,0.35))",
        willChange: "transform, opacity",
      }}
      initial={{ opacity: 0, rotate: star.angleDeg, x: -dx * 0.04, y: -dy * 0.04 }}
      animate={{
        opacity: [0, 0.95, 0.75, 0],
        x: [-dx * 0.04, dx * 1.02],
        y: [-dy * 0.04, dy * 1.02],
        rotate: star.angleDeg,
      }}
      transition={{ duration: star.durationSec, ease: [0.2, 0.85, 0.15, 1] }}
      onAnimationComplete={onDone}
    />
  );
}
