"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Props = {
  onEnterMap: () => void;
};

/**
 * LAYER navigation — HOME: desktop-first entry, single path into the spatial map (Yunnan only).
 */
export function MemoryTideHomeGate({ onEnterMap }: Props) {
  return (
    <div className="relative flex min-h-0 flex-1 w-full flex-col justify-center px-[min(5vw,3.5rem)] py-[min(4vh,2.5rem)] lg:flex-row lg:items-center lg:justify-between lg:gap-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_20%,rgba(90,70,160,0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_80%_90%,rgba(40,60,120,0.12),transparent_50%)]" />

      <div className="relative z-[1] max-w-xl flex-1">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.38em] text-violet-400/65">Memory Tide</p>
        <h1 className="mt-4 text-balance font-display text-[clamp(1.75rem,3.2vw,2.75rem)] font-medium leading-[1.12] tracking-tight text-[#faf8ff]/96">
          Spatial travel memory
        </h1>
        <p className="mt-5 max-w-md text-[13px] leading-[1.75] text-violet-200/52">
          One place on Earth holds the record — Yunnan. Enter the map to orbit, touch the marker, and let the memory
          surface slowly.
        </p>
      </div>

      <div className="relative z-[1] mt-12 flex w-full max-w-sm flex-col items-stretch gap-4 lg:mt-0 lg:w-auto lg:min-w-[280px]">
        <motion.button
          type="button"
          onClick={onEnterMap}
          className="rounded-2xl border border-violet-400/35 bg-white/[0.07] px-8 py-4 text-center font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-50 shadow-[0_0_28px_rgba(120,100,200,0.18)] transition hover:border-violet-300/55 hover:bg-white/[0.1]"
          whileTap={{ scale: 0.99 }}
        >
          Enter memory map
        </motion.button>
        <Link
          href="/"
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-violet-400/55 transition hover:border-violet-400/25 hover:text-violet-300/75"
        >
          Memory Dump 相册（首页）
        </Link>
        <p className="text-center text-[10px] text-violet-500/40">Trace · wish · echoes stay in the album for now.</p>
      </div>
    </div>
  );
}
