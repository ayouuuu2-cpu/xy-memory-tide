"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Star = { x: number; y: number; r: number; o: number; d: number };

/** Deterministic star field — same output on server and client for a given count. */
function makeStars(count: number): Star[] {
  const out: Star[] = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const t = seed - Math.floor(seed);
    out.push({
      x: (Math.sin(i * 2.17) * 0.5 + 0.5) * 100,
      y: (Math.cos(i * 1.91) * 0.5 + 0.5) * 100,
      r: 0.5 + (t % 1) * 2.4,
      o: 0.18 + ((t * 7) % 1) * 0.6,
      d: 2 + ((t * 11) % 1) * 5.5,
    });
  }
  return out;
}

type Props = {
  onComplete: () => void;
};

export function DreamLoadingScreen({ onComplete }: Props) {
  const controls = useAnimationControls();
  /** Empty on SSR + first client paint; filled in useEffect only (post-hydration). */
  const [stars, setStars] = useState<Star[]>([]);
  const sparkles = useMemo(
    () =>
      [...Array(18)].map((_, i) => ({
        x: (i * 53) % 92,
        y: (i * 37) % 88,
        s: 6 + (i % 5) * 3,
        d: 3 + (i % 4),
      })),
    [],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setStars(makeStars(96));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const durationMs = 3000 + Math.floor(Math.random() * 2001);
    const tid = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        await controls.start({
          opacity: 0,
          filter: "blur(14px)",
          transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
        });
        if (!cancelled) onComplete();
      })();
    }, durationMs);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [controls, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={controls}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_85%_at_50%_18%,#fffdf9_0%,#f3ecff_32%,#dcd4ff_58%,#b8c4f5_82%,#9aa8e8_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_20%_85%,rgba(255,220,240,0.5)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_85%_25%,rgba(200,230,255,0.45)_0%,transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,transparent_40%,rgba(150,160,230,0.12)_100%)]" />

      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            boxShadow: "0 0 12px rgba(255,230,255,0.55)",
          }}
          initial={{ opacity: s.o * 0.35 }}
          animate={{ opacity: [s.o * 0.3, s.o, s.o * 0.4], scale: [1, 1.2, 1] }}
          transition={{ duration: s.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={`cloud-${i}`}
          className="pointer-events-none absolute rounded-[999px] bg-white/30 blur-3xl"
          style={{
            width: `min(${48 + i * 8}vw, 480px)`,
            height: `${10 + (i % 3) * 4}vmin`,
            top: `${12 + i * 15}%`,
            left: `${-15 + i * 10}%`,
          }}
          animate={{ x: ["-6%", "8%", "-3%"], opacity: [0.35, 0.55, 0.38] }}
          transition={{ duration: 20 + i * 3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {sparkles.map((sp, i) => (
        <motion.span
          key={`sp-${i}`}
          className="pointer-events-none absolute text-violet-300/90"
          style={{ left: `${sp.x}%`, top: `${sp.y}%`, fontSize: sp.s }}
          animate={{ opacity: [0, 1, 0.3, 0.9, 0], rotate: [0, 22, -8, 0] }}
          transition={{ duration: sp.d + 2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
        >
          ✦
        </motion.span>
      ))}

      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`bubble-${i}`}
          className="pointer-events-none absolute rounded-full border border-white/30 bg-white/10"
          style={{
            width: 12 + (i % 4) * 9,
            height: 12 + (i % 4) * 9,
            left: `${(i * 19) % 90}%`,
            bottom: "-8%",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, -130 - (i % 5) * 45], opacity: [0, 0.45, 0.25, 0] }}
          transition={{
            duration: 8 + (i % 4),
            repeat: Infinity,
            delay: i * 0.45,
            ease: "easeOut",
          }}
        />
      ))}

      <div className="relative z-10 flex max-w-md flex-col items-center px-6 text-center sm:px-10">
        <motion.div
          className="rounded-[2.5rem] border border-white/40 bg-white/35 px-8 py-10 shadow-[0_20px_60px_rgba(140,130,200,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md sm:px-12 sm:py-12"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="font-display text-[12px] font-semibold tracking-[0.2em] text-violet-600/90 sm:text-[13px]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.05 }}
          >
            Memory Tide
          </motion.p>
          <motion.h1
            className="font-display mt-4 text-balance text-3xl font-medium tracking-tight text-violet-950/95 sm:text-4xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.05, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            X-Y Memory Tide
          </motion.h1>
          <motion.p
            className="mt-4 text-pretty text-sm font-semibold leading-relaxed text-violet-800/85 sm:text-[15px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            Where We’ve Been
          </motion.p>
          <motion.div
            className="mt-8 h-1.5 w-28 rounded-full bg-gradient-to-r from-transparent via-violet-300/60 to-transparent"
            initial={{ scaleX: 0.2, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
      </div>

      <motion.p
        className="pointer-events-none absolute bottom-8 max-w-xs px-6 text-center font-display text-[12px] font-medium tracking-wide text-violet-700/70 sm:bottom-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.75 }}
        transition={{ delay: 0.55, duration: 1.3 }}
      >
        Shhh… the tide is gathering your stars.
      </motion.p>
    </motion.div>
  );
}
