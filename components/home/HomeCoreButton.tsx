"use client";

import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { useHomeGate } from "@/contexts/HomeGateContext";

/**
 * Global Home — frosted “core” control (see `.memory-tide-home-core` in globals); returns to main album.
 */
export function HomeCoreButton() {
  const { requestHome } = useHomeGate();

  return (
    <motion.button
      type="button"
      aria-label="Home — return to memory album"
      title="Home"
      onClick={requestHome}
      className="memory-tide-home-core pointer-events-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.span
        className="relative flex items-center justify-center"
        animate={{ opacity: [0.75, 1, 0.82, 1, 0.75] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Home className="h-[1.15rem] w-[1.15rem] text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]" strokeWidth={2.1} aria-hidden />
      </motion.span>
    </motion.button>
  );
}
