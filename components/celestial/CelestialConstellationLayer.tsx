"use client";

import { motion } from "framer-motion";
import type { CelestialBirthdayMode } from "@/lib/celestial";

/** Simplified constellation strokes behind stars (Virgo / Scorpio). */
export function CelestialConstellationLayer({ mode }: { mode: CelestialBirthdayMode }) {
  if (mode === "virgo") {
    return (
      <motion.svg
        className="pointer-events-none absolute right-[8%] top-[12%] h-[min(42vh,320px)] w-[min(48vw,420px)] opacity-[0.22]"
        viewBox="0 0 200 180"
        fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.22 }}
        transition={{ duration: 1.2 }}
        aria-hidden
      >
        <path
          d="M20 140 L55 95 L90 110 L120 70 L150 55 L175 40"
          stroke="rgba(255, 232, 190, 0.85)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M55 95 L70 130 L100 150"
          stroke="rgba(255, 240, 210, 0.65)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        {[[20, 140], [55, 95], [90, 110], [120, 70], [150, 55], [175, 40]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.2" fill="rgba(255, 248, 220, 0.9)" />
        ))}
      </motion.svg>
    );
  }

  return (
    <motion.svg
      className="pointer-events-none absolute left-[6%] top-[18%] h-[min(38vh,280px)] w-[min(44vw,380px)] opacity-[0.2]"
      viewBox="0 0 200 200"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.2 }}
      transition={{ duration: 1.2 }}
      aria-hidden
    >
      <path
        d="M40 160 L70 120 L100 100 L130 75 L160 90 L175 120"
        stroke="rgba(200, 170, 255, 0.9)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M100 100 L95 130 L120 150" stroke="rgba(160, 130, 220, 0.75)" strokeWidth="0.9" strokeLinecap="round" />
      {[[40, 160], [70, 120], [100, 100], [130, 75], [160, 90], [175, 120]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="rgba(220, 200, 255, 0.95)" />
      ))}
    </motion.svg>
  );
}
