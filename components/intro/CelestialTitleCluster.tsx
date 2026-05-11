"use client";

import { motion } from "framer-motion";
import { useId } from "react";

function DiamondSparkle({ className, filterId }: { className?: string; filterId: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      aria-hidden
      initial={{ opacity: 0.35, scale: 0.85 }}
      animate={{ opacity: [0.35, 1, 0.55, 1, 0.35], scale: [0.85, 1.05, 0.95, 1.02, 0.85] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
        fill="rgba(255,255,255,0.92)"
        stroke="rgba(200,220,255,0.55)"
        strokeWidth="0.35"
        filter={`url(#${filterId})`}
      />
    </motion.svg>
  );
}

/** Small five-point star tucked into the word shapes (ref. ITZY-style logo). */
function EmbeddedTitleStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="rgba(255,255,255,0.98)"
        d="M12 2.2l2.35 7.15h7.6L15.9 14.9l2.35 7.15-6.25-4.55-6.25 4.55L8.1 14.9 2.05 9.35h7.6L12 2.2z"
      />
    </svg>
  );
}

function ConstellationHint({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 40" fill="none" aria-hidden>
      <path
        d="M4 28 L22 18 L38 24 L58 10 L78 16 L96 6 L116 14"
        stroke="rgba(220,230,255,0.18)"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 3"
      />
      {[
        [4, 28],
        [22, 18],
        [38, 24],
        [58, 10],
        [78, 16],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.9" fill="rgba(255,255,255,0.28)" />
      ))}
    </svg>
  );
}

/**
 * Main script title only — no side words (keeps Rory / 星星人 area from being squeezed).
 */
export function CelestialTitleCluster() {
  const uid = useId().replace(/:/g, "");

  return (
    <div className="memory-tide-celestial-cluster pointer-events-none relative z-[112] mx-auto w-full max-w-[min(92vw,520px)] px-2 pb-0 pt-0 leading-none">
      <ConstellationHint className="pointer-events-none absolute -right-1 top-1/2 h-7 w-[5.25rem] -translate-y-1/2 opacity-55 sm:right-0" />

      <div className="relative flex flex-col items-center gap-0">
        <motion.div
          className="flex items-center justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <DiamondSparkle className="opacity-70" filterId={`${uid}-sp0`} />
          <motion.h1
            className="memory-tide-celestial-main relative px-2 text-center sm:px-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="memory-tide-celestial-main__line">
              <span className="memory-tide-celestial-main__word">
                Memory
                <EmbeddedTitleStar className="memory-tide-celestial-main__embed-star memory-tide-celestial-main__embed-star--memory" />
              </span>
            </span>
            <span className="memory-tide-celestial-main__line">
              <span className="memory-tide-celestial-main__word">
                Tide
                <EmbeddedTitleStar className="memory-tide-celestial-main__embed-star memory-tide-celestial-main__embed-star--tide" />
              </span>
            </span>
            <span className="sr-only">X-Y Memory Tide</span>
          </motion.h1>
          <DiamondSparkle className="opacity-70" filterId={`${uid}-sp1`} />
        </motion.div>

      </div>

      <ConstellationHint className="pointer-events-none absolute -left-1 top-1/2 h-6 w-[4.5rem] -translate-y-1/2 rotate-180 opacity-45 sm:left-0" />
    </div>
  );
}
