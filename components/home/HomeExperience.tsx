"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { DreamLoadingScreen } from "@/components/loading/DreamLoadingScreen";
import { EarthHero } from "@/components/earth/EarthHero";

export function HomeExperience() {
  const [loading, setLoading] = useState(true);
  const handleDone = useCallback(() => setLoading(false), []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#060814] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#1a2450_0%,#0b1024_42%,#05060d_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(120,150,220,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.5%22/%3E%3C/svg%3E')]" />

      <main className="relative z-10 flex min-h-dvh min-w-0 flex-col px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
        <header className="mx-auto w-full max-w-3xl text-center">
          <motion.p
            className="text-[11px] font-medium tracking-[0.38em] text-slate-400/90 uppercase"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: loading ? 0 : 1, y: loading ? -6 : 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            X-Y Memory Tide
          </motion.p>
          <motion.h1
            className="mt-3 text-balance text-2xl font-medium tracking-tight text-slate-50/95 sm:text-3xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: loading ? 0 : 1, y: loading ? 8 : 0 }}
            transition={{ duration: 1.15, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            Where We’ve Been
          </motion.h1>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-6 sm:py-8">
          <EarthHero />
        </div>

        <footer className="mx-auto w-full max-w-md text-center">
          <motion.p
            className="text-[12px] leading-relaxed text-slate-500/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: loading ? 0 : 0.85 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            Gathering the moments we left behind—soft as tide, clear as glass.
          </motion.p>
        </footer>
      </main>

      {loading && <DreamLoadingScreen key="intro" onComplete={handleDone} />}
    </div>
  );
}
