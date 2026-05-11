"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const CLOUD_LAYOUT = [
  { left: "6%", top: "4%", w: "min(44vw, 340px)", h: "min(24vh, 200px)" },
  { left: "38%", top: "8%", w: "min(38vw, 300px)", h: "min(20vh, 170px)" },
  { left: "68%", top: "5%", w: "min(40vw, 320px)", h: "min(22vh, 185px)" },
  { left: "22%", top: "16%", w: "min(36vw, 280px)", h: "min(18vh, 150px)" },
];

type Props = {
  children?: ReactNode;
  rippleCloudIndex: number | null;
  onRippleComplete?: () => void;
};

/**
 * Soft drifting jelly clouds for /wish — top area only; eternal stars render as children.
 */
export function JellyCloudWishBackdrop({ children, rippleCloudIndex, onRippleComplete }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[6] h-[38vh] overflow-visible">
      {CLOUD_LAYOUT.map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-[50%] border border-white/[0.12] bg-gradient-to-br from-violet-200/[0.14] via-fuchsia-100/[0.08] to-amber-100/[0.1] shadow-[0_0_50px_rgba(180,160,255,0.22)]"
          style={{
            left: c.left,
            top: c.top,
            width: c.w,
            height: c.h,
            opacity: 0.3,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          animate={{ x: [-20, 20, -20] }}
          transition={{
            duration: 26 + i * 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 1.2,
          }}
        >
          {rippleCloudIndex === i && (
            <motion.span
              className="pointer-events-none absolute inset-[-4px] block rounded-[inherit] border border-violet-200/45 bg-violet-300/10"
              initial={{ scale: 0.88, opacity: 0.65 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => onRippleComplete?.()}
            />
          )}
        </motion.div>
      ))}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
