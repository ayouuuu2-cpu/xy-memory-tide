"use client";

import { motion } from "framer-motion";

export function EarthHero() {
  return (
    <motion.div
      className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex justify-center px-6 sm:bottom-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.25, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="max-w-sm rounded-full border border-white/20 bg-white/[0.08] px-5 py-2.5 text-center text-[12px] font-semibold tracking-wide text-violet-100/90 shadow-[0_6px_28px_rgba(60,40,120,0.35)] backdrop-blur-md">
        ✦ Follow the little glow on the Earth — it remembers for you ✦
      </p>
    </motion.div>
  );
}
