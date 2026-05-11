"use client";

import { motion } from "framer-motion";
import type { VisionDream } from "@/lib/vision-dreams";
import { cloudStarPositionForId } from "@/lib/wish-cloud-stars";

type Props = {
  wish: VisionDream;
};

export function CloudWhisperStar({ wish }: Props) {
  const { leftPct, topVh } = cloudStarPositionForId(wish.id);
  const label = `${wish.query} — Dream achieved`;
  const phase = wish.id.length * 0.17;

  return (
    <motion.div
      className="pointer-events-auto absolute z-[7] -translate-x-1/2 -translate-y-1/2 cursor-default"
      style={{ left: `${leftPct}%`, top: `${topVh}vh` }}
      title={label}
      animate={{
        opacity: [0.45, 1, 0.55, 1, 0.45],
        scale: [0.9, 1.12, 0.95, 1.08, 0.9],
      }}
      transition={{
        duration: 2.4 + phase,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div
        className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-200 via-fuchsia-200 to-violet-400 shadow-[0_0_14px_rgba(255,235,255,0.95),0_0_28px_rgba(190,160,255,0.45)]"
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </motion.div>
  );
}
