"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCelestial } from "@/contexts/CelestialContext";

const KEY = "memory-tide-virgo-birthday-splash";

/**
 * 9·14 当天手写感开屏祝福（当日首次进入时展示，关闭后记 session，午夜后自然失效）。
 */
export function CelestialBirthdaySplashModal() {
  const { celestialBirthday } = useCelestial();
  const [open, setOpen] = useState(false);

  const dayKey = useMemo(() => {
    const d = new Date();
    return `${KEY}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }, []);

  useEffect(() => {
    if (celestialBirthday !== "virgo" || typeof window === "undefined") {
      setOpen(false);
      return;
    }
    if (sessionStorage.getItem(dayKey) === "1") return;
    setOpen(true);
  }, [celestialBirthday, dayKey]);

  const dismiss = () => {
    if (typeof window !== "undefined") sessionStorage.setItem(dayKey, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="virgo-splash"
          role="dialog"
          aria-modal="true"
          aria-label="生日祝福"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto fixed inset-0 z-[250] flex items-center justify-center bg-black/35 px-6 backdrop-blur-[2px]"
          onClick={() => dismiss()}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md rounded-[22px] border border-amber-200/35 bg-gradient-to-br from-[#2a1838]/95 via-[#1a1230]/96 to-[#120a22]/97 px-6 py-6 shadow-[0_24px_60px_rgba(40,20,60,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-center text-[clamp(1.05rem,2.8vw,1.25rem)] font-medium leading-relaxed text-amber-50">
              Happy Birthday! 你是这片记忆星海中最闪亮的一颗。
            </p>
            <button
              type="button"
              className="mx-auto mt-5 block rounded-full border border-white/18 px-4 py-2 text-[12px] text-violet-100/85"
              onClick={() => dismiss()}
            >
              收下星光 ✨
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
