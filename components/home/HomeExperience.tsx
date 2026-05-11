"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { DreamFriends } from "@/components/atmosphere/DreamFriends";
import { MemoryUniverse } from "@/components/atmosphere/MemoryUniverse";
import { DreamLoadingScreen } from "@/components/loading/DreamLoadingScreen";
import { EarthHero } from "@/components/earth/EarthHero";
import { GlobeCanvas } from "@/components/earth/GlobeCanvas";

export function HomeExperience() {
  const [loading, setLoading] = useState(true);
  const handleDone = useCallback(() => setLoading(false), []);

  return (
    <div className="relative min-h-dvh overflow-visible text-[#f4f0ff]">
      <MemoryUniverse variant="night" />
      <GlobeCanvas />
      {!loading && <DreamFriends visible />}

      <main className="relative z-[12] flex min-h-dvh min-w-0 flex-col px-5 pb-8 pt-12 pointer-events-none sm:px-8 sm:pt-14">
        <header className="pointer-events-auto mx-auto w-full max-w-lg text-center">
          <motion.div
            className="rounded-[2.25rem] border border-white/20 bg-white/[0.07] px-7 py-8 shadow-[0_12px_48px_rgba(80,60,140,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md sm:px-10 sm:py-9"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{
              opacity: loading ? 0 : 1,
              y: loading ? 10 : 0,
              scale: loading ? 0.98 : 1,
            }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.p
              className="font-display text-[12px] font-medium tracking-[0.12em] text-violet-200/90 sm:text-[13px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: loading ? 0 : 1 }}
              transition={{ delay: 0.05, duration: 0.9 }}
            >
              X-Y Memory Tide
            </motion.p>
            <motion.h1
              className="font-display mt-3 text-balance text-[1.65rem] font-medium leading-snug tracking-tight text-[#fff9fc] sm:text-[2.1rem]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: loading ? 0 : 1, y: loading ? 6 : 0 }}
              transition={{ duration: 1.05, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              Where We’ve Been
            </motion.h1>
            <motion.p
              className="mt-4 text-pretty text-[13px] font-medium leading-relaxed text-violet-100/75 sm:text-[14px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: loading ? 0 : 1 }}
              transition={{ delay: 0.2, duration: 1 }}
            >
              A gentle map of moments — floating, tender, and yours.
            </motion.p>
          </motion.div>
        </header>

        <div className="min-h-0 flex-1" aria-hidden />

        <footer className="pointer-events-auto mx-auto w-full max-w-md px-2 pb-4 text-center sm:pb-6">
          <motion.div
            className="rounded-[1.75rem] border border-white/15 bg-indigo-950/25 px-5 py-4 shadow-[0_8px_32px_rgba(40,30,90,0.35)] backdrop-blur-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: loading ? 0 : 1, y: loading ? 8 : 0 }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[13px] font-medium leading-relaxed text-violet-100/80">
              Like a scrapbook made of starlight — memories you can wander through, softly.
            </p>
          </motion.div>
        </footer>
      </main>

      {!loading && <EarthHero />}

      {loading && <DreamLoadingScreen key="intro" onComplete={handleDone} />}
    </div>
  );
}
