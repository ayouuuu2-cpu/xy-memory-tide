"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MemoryDumpAlbum } from "@/components/home/MemoryDumpAlbum";
import { CursorSparkles } from "@/components/playful/CursorSparkles";
import { DreamOpeningLoader } from "@/components/intro/DreamOpeningLoader";
import { MEMORY_TIDE_HOME_EVENT } from "@/contexts/HomeGateContext";

/**
 * Home: primary surface = non-linear “memory dump” album; Trace/Wish portals overlay on demand.
 * Global Home core (see `HomeCoreButton`) closes this overlay and returns to the album.
 */
export function ExperienceRoot() {
  const [portalsOpen, setPortalsOpen] = useState(false);

  useEffect(() => {
    const onHome = () => setPortalsOpen(false);
    window.addEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
    return () => window.removeEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#080c14] text-[#f4f0ff] supports-[min-height:100dvh]:min-h-[100dvh] min-h-screen">
      <CursorSparkles />
      <MemoryDumpAlbum onOpenPortals={() => setPortalsOpen(true)} />
      <AnimatePresence>
        {portalsOpen && (
          <motion.div
            key="portals-overlay"
            className="fixed inset-0 z-[151]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <DreamOpeningLoader />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
