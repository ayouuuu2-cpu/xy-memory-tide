"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { BackNavButton } from "./BackNavButton";
import { RoryMarkCelebration } from "./RoryMarkCelebration";
import { MemoryTideBackground } from "./MemoryTideBackground";

type Props = {
  children: ReactNode;
  /**
   * Trace/Wish 等页：关闭 MemoryTideBackground 中央「潮汐锥光」，否则高透果冻地球后面会看到一道巨型矩形光柱，
   * 容易误判为地球被裁切/画成方盒子（实为 CSS 背景透视叠层，不是像素损坏）。
   */
  suppressCentralSpotlight?: boolean;
};

/**
 * Quest sub-pages: same mist + star field as home (no flat color), minimalist back control, full-height column.
 */
export function MemoryTidePageShell({ children, suppressCentralSpotlight = false }: Props) {
  // Root uses overflow-x-visible so Trace/Wish full-bleed globe is not clipped; html overflow-x hidden suppresses scrollbar.
  return (
    <div className="relative min-h-dvh overflow-x-visible text-[#f4f0ff]">
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <MemoryTideBackground
          showSpotlight={!suppressCentralSpotlight}
          baseLayerMix={0.48}
          stardustBaseCount={suppressCentralSpotlight ? 42 : 210}
        />
      </div>
      <BackNavButton />
      <RoryMarkCelebration />
      <motion.main
        className="relative z-10 mx-auto box-border flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-6 pt-16 sm:px-8 sm:pb-8 sm:pt-20 [&>.flex-1]:min-h-0"
        initial={{ opacity: 0, scale: 0.99, y: 12, filter: "blur(5px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-visible">{children}</div>
      </motion.main>
    </div>
  );
}
