"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";
import { HOME_MIST_BG } from "@/lib/memory-tide-assets";
import { BackNavButton } from "./BackNavButton";
import { RoryMarkCelebration } from "./RoryMarkCelebration";
import { MemoryTideBackground } from "./MemoryTideBackground";

type Props = {
  children: ReactNode;
};

/**
 * Quest sub-pages: same mist + star field as home (no flat color), minimalist back control, full-height column.
 */
export function MemoryTidePageShell({ children }: Props) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden text-[#f4f0ff]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image src={HOME_MIST_BG} alt="" fill className="object-cover object-center" priority sizes="100vw" quality={92} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <MemoryTideBackground showSpotlight baseLayerMix={0.48} />
      </div>
      <BackNavButton />
      <RoryMarkCelebration />
      <motion.main
        className="relative z-10 mx-auto box-border flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-6 pt-16 sm:px-8 sm:pb-8 sm:pt-20"
        initial={{ opacity: 0, scale: 0.98, y: 16, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </motion.main>
    </div>
  );
}
