"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const OceanLoadingCanvas = dynamic(
  () =>
    import("@/components/loading/OceanLoadingCanvas").then((m) => m.OceanLoadingCanvas),
  { ssr: false },
);

type Props = {
  onComplete: () => void;
};

/** Cinematic ocean loading: WebGL waves + layered haze + floating UI copy. */
export function OceanLoadingScene({ onComplete }: Props) {
  const [exit, setExit] = useState(false);
  const [durationMs] = useState(() => 3200 + Math.floor(Math.random() * 1800));

  useEffect(() => {
    const t = window.setTimeout(() => setExit(true), durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: exit ? 0 : 1 }}
      transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (exit) onComplete();
      }}
    >
      <OceanLoadingCanvas />

      {/* Parallax cloud layers (CSS, slow drift) */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-1/4 top-[8%] h-[28vmin] w-[90vmin] rounded-[999px] bg-gradient-to-r from-white/12 to-transparent blur-3xl"
          animate={{ x: ["0%", "12%", "4%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[-20%] top-[22%] h-[22vmin] w-[70vmin] rounded-[999px] bg-violet-300/10 blur-3xl"
          animate={{ x: ["0%", "-10%", "-3%"] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[15%] left-[10%] h-[18vmin] w-[55vmin] rounded-[999px] bg-sky-400/10 blur-3xl"
          animate={{ opacity: [0.35, 0.55, 0.4] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Dream haze */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_0%,rgba(5,10,25,0.5)_70%,rgba(3,6,18,0.92)_100%)]" />
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" />

      {/* Title */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.h1
          className="max-w-[18ch] font-semibold tracking-wide text-[clamp(1.75rem,6vw,3rem)] text-[#f5f2ff]"
          style={{
            fontFamily: "var(--font-quicksand), ui-rounded, system-ui, sans-serif",
            textShadow:
              "0 0 40px rgba(180,190,255,0.45), 0 0 80px rgba(100,120,200,0.25)",
          }}
          animate={{
            scale: [1, 1.03, 1],
            opacity: [0.92, 1, 0.92],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          X-Y Memory Tide
        </motion.h1>
        <motion.p
          className="mt-5 max-w-md text-[clamp(0.95rem,2.8vw,1.15rem)] font-medium tracking-[0.06em] text-violet-100/50"
          style={{ opacity: 0.5 }}
          animate={{ opacity: [0.42, 0.58, 0.42] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          Where we’ve been
        </motion.p>
      </div>
    </motion.div>
  );
}
