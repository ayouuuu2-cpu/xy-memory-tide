"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { GlobeCanvas } from "@/components/earth/GlobeCanvas";

export function EarthHero() {
  const markerRef = useRef<HTMLAnchorElement>(null);

  return (
    <motion.div
      className="relative mx-auto flex w-full max-w-[100vw] justify-center px-1"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.35, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative aspect-square w-[min(86vmin,82dvw,54dvh,520px)] max-w-full shrink-0 overflow-hidden rounded-full shadow-[0_40px_120px_rgba(25,35,70,0.35),inset_0_0_60px_rgba(255,255,255,0.08)] ring-1 ring-white/15">
        <GlobeCanvas markerRef={markerRef} className="block size-full select-none" />
        <Link
          ref={markerRef}
          href="/memory/yunnan-dawn"
          className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 opacity-0 outline-none ring-1 ring-white/35 backdrop-blur-[2px] transition-[transform,box-shadow] duration-500 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-sky-200/80"
          style={{ left: "50%", top: "50%" }}
          aria-label="Open Yunnan memory"
        >
          <span className="relative flex size-3.5 rounded-full bg-gradient-to-br from-sky-100 to-indigo-200 shadow-[0_0_22px_rgba(186,210,255,0.95),0_0_48px_rgba(120,160,255,0.45)]" />
        </Link>
      </div>
      <p className="pointer-events-none mt-6 text-center text-[11px] font-medium tracking-[0.18em] text-slate-500/75">
        Touch the light where memory lingers
      </p>
    </motion.div>
  );
}
