"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Star = { x: number; y: number; r: number; o: number; d: number };

function makeStars(count: number): Star[] {
  const out: Star[] = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const t = seed - Math.floor(seed);
    out.push({
      x: (Math.sin(i * 2.17) * 0.5 + 0.5) * 100,
      y: (Math.cos(i * 1.91) * 0.5 + 0.5) * 100,
      r: 0.4 + (t % 1) * 1.2,
      o: 0.15 + ((t * 7) % 1) * 0.55,
      d: 2 + ((t * 11) % 1) * 5,
    });
  }
  return out;
}

type Props = {
  onComplete: () => void;
};

export function DreamLoadingScreen({ onComplete }: Props) {
  const controls = useAnimationControls();
  const stars = useMemo(() => makeStars(72), []);
  const [durationMs] = useState(() => 3000 + Math.floor(Math.random() * 2001));

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await new Promise<void>((r) => {
        window.setTimeout(r, durationMs);
      });
      if (cancelled) return;
      await controls.start({
        opacity: 0,
        filter: "blur(10px)",
        transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
      });
      if (!cancelled) onComplete();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [controls, durationMs, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={controls}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_20%,#f7f4ef_0%,#e8e4f4_38%,#c9d4f2_62%,#9aa8d9_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(255,255,255,0.55)_0%,transparent_55%)] opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_35%,rgba(120,110,180,0.08)_100%)]" />

      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            boxShadow: "0 0 8px rgba(255,255,255,0.35)",
          }}
          initial={{ opacity: s.o * 0.4 }}
          animate={{ opacity: [s.o * 0.35, s.o, s.o * 0.45] }}
          transition={{ duration: s.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={`cloud-${i}`}
          className="pointer-events-none absolute h-24 w-[min(55vw,420px)] rounded-full bg-white/25 blur-2xl"
          style={{ top: `${18 + i * 14}%`, left: `${-10 + i * 8}%` }}
          initial={{ x: "-8%" }}
          animate={{ x: ["-8%", "12%", "-4%"] }}
          transition={{ duration: 18 + i * 3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {[...Array(10)].map((_, i) => (
        <motion.div
          key={`bubble-${i}`}
          className="pointer-events-none absolute rounded-full border border-white/25 bg-white/5"
          style={{
            width: 10 + (i % 4) * 8,
            height: 10 + (i % 4) * 8,
            left: `${(i * 17) % 92}%`,
            bottom: "-6%",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, -110 - (i % 5) * 40], opacity: [0, 0.35, 0.2, 0] }}
          transition={{
            duration: 7 + (i % 4),
            repeat: Infinity,
            delay: i * 0.55,
            ease: "easeOut",
          }}
        />
      ))}

      <div className="relative z-10 flex max-w-md flex-col items-center px-8 text-center">
        <motion.p
          className="mb-3 text-[11px] font-medium tracking-[0.35em] text-slate-500/90 uppercase"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          Memory Tide
        </motion.p>
        <motion.h1
          className="text-balance font-medium tracking-tight text-slate-800/95 text-3xl sm:text-4xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          X-Y Memory Tide
        </motion.h1>
        <motion.p
          className="mt-4 text-pretty text-slate-600/90 text-sm sm:text-[15px] leading-relaxed tracking-wide"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.05, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          Where We’ve Been
        </motion.p>
        <motion.div
          className="mt-10 h-px w-24 bg-gradient-to-r from-transparent via-slate-400/35 to-transparent"
          initial={{ scaleX: 0.3, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.35, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-10 text-[11px] tracking-[0.22em] text-slate-500/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ delay: 0.6, duration: 1.4 }}
      >
        A quiet breath before the tide
      </motion.div>
    </motion.div>
  );
}
