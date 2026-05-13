"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MemoryDumpAlbum } from "@/components/home/MemoryDumpAlbum";
import { CursorSparkles } from "@/components/playful/CursorSparkles";
import { DreamOpeningLoader } from "@/components/intro/DreamOpeningLoader";
import { MEMORY_TIDE_HOME_EVENT } from "@/contexts/HomeGateContext";

/**
 * Home: Rory / star-person cover (`DreamOpeningLoader`) first; Memory Dump album underneath.
 * Trace · Wish on the album re-opens the cover hubs; global Home core closes overlays per context.
 * Spatial Yunnan map lives at `/map` (see `app/map/page.tsx`).
 */
export function ExperienceRoot() {
  const [coverOpen, setCoverOpen] = useState(true);

  useEffect(() => {
    const onHome = () => setCoverOpen(false);
    window.addEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
    return () => window.removeEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent text-[#f4f0ff] supports-[min-height:100dvh]:min-h-[100dvh] min-h-screen">
      <CursorSparkles />
      {!coverOpen ? <MemoryDumpAlbum onOpenPortals={() => setCoverOpen(true)} /> : null}
      <AnimatePresence>
        {coverOpen && (
          <motion.div
            key="memory-tide-cover"
            className="fixed inset-0 z-[151]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <DreamOpeningLoader
              onEnterPark={() => setCoverOpen(false)}
              enterParkLabel="Memory Dump 相册"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
