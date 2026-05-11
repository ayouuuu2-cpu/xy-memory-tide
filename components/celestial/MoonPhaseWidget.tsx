"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { useCelestial } from "@/contexts/CelestialContext";

/** Minimal moon glyph (top-right); phase from SunCalc `getMoonIllumination`. */
export function MoonPhaseWidget() {
  const uid = useId().replace(/:/g, "");
  const { moon, isFullMoon } = useCelestial();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const r = 18;
  const cx = 22;
  const cy = 22;
  /** Server + first client paint: neutral phase (offset 0) to avoid hydration mismatch on `cx`. */
  const offset = mounted ? (moon.phase - 0.5) * 2.05 * r : 0;
  const showFullMoonCorona = mounted && isFullMoon;

  return (
    <motion.div
      className="pointer-events-none fixed right-5 top-5 z-[118] sm:right-8 sm:top-8"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="drop-shadow-[0_0_12px_rgba(255,248,220,0.35)]">
        <defs>
          <radialGradient id={`${uid}-core`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fffef6" />
            <stop offset="55%" stopColor="#e8e0d4" />
            <stop offset="100%" stopColor="#c8bdd0" />
          </radialGradient>
          <clipPath id={`${uid}-clip`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-clip)`}>
          <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-core)`} />
          <circle cx={cx + offset} cy={cy} r={r * 0.98} fill="#0a0614" opacity={0.78} />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,250,235,0.32)" strokeWidth="1" />
        {showFullMoonCorona && (
          <motion.g
            key="corona"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            initial={{ opacity: 0.25, scale: 1 }}
            animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.22, 1] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="rgba(255, 250, 220, 0.55)" strokeWidth="1.5" />
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
}
