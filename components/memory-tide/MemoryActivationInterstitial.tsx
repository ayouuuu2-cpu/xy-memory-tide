"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MemoryTransitionMode } from "@/lib/memory-transition-phrases";
import { RORY_TYPING } from "@/lib/rory-assets";

type Props = {
  phrase: string;
  mode: MemoryTransitionMode;
  durationMs: number;
  onComplete: () => void;
};

/**
 * Layer 3 — memory activation: centered cinematic line, typewriter over fixed window.
 */
export function MemoryActivationInterstitial({ phrase, mode, durationMs, onComplete }: Props) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    doneRef.current = false;
    setCount(0);
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.max(0, Math.ceil(phrase.length * t));
      setCount(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        const pauseMs = 280;
        const sinceEnd = now - start - durationMs;
        if (sinceEnd >= pauseMs) {
          doneRef.current = true;
          onCompleteRef.current();
        } else {
          raf = requestAnimationFrame(tick);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phrase, durationMs]);

  const visible = phrase.slice(0, count);
  const modeLabel =
    mode === "fragment" ? "memory fragment" : mode === "system" ? "trace" : "echo";

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[18] flex flex-col items-center justify-center gap-6 bg-black/12 px-8 pb-[min(12vh,6rem)] backdrop-blur-[1px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
      aria-busy="true"
    >
      <p className="sr-only">Memory activation — {modeLabel}</p>
      <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-center">
        <motion.p
        className="font-display max-w-[min(42rem,88vw)] text-center text-[clamp(0.95rem,1.35vw,1.15rem)] font-medium leading-relaxed tracking-[0.04em] text-[#f4f0ff]/88"
        initial={{ opacity: 0, filter: "blur(6px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {visible}
        {count < phrase.length ? (
          <span className="ml-0.5 inline-block w-[2px] animate-pulse align-baseline text-violet-200/60">|</span>
        ) : null}
      </motion.p>
      <motion.p
        className="font-display mt-5 max-w-md text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-200/85"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ delay: 0.35, duration: 0.8 }}
      >
        Yunnan
      </motion.p>
      </div>
      <motion.div
        className="shrink-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={RORY_TYPING}
          alt=""
          width={120}
          height={120}
          className="memory-tide-rory-ethereal h-[min(22vh,120px)] w-auto object-contain object-bottom opacity-95"
          unoptimized
        />
      </motion.div>
    </motion.div>
  );
}
