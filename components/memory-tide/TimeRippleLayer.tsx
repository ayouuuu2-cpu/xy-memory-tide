"use client";

import { AnimatePresence, motion } from "framer-motion";

export function TimeRippleLayer({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
      <AnimatePresence>
        {active && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute aspect-square w-[min(120vmin,900px)] rounded-full border border-cyan-200/20 bg-transparent"
                initial={{ scale: 0.35, opacity: 0.5 }}
                animate={{ scale: 1.35 + i * 0.12, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.8 + i * 0.4,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.45,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
