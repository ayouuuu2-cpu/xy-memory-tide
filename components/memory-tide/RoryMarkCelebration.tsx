"use client";

import { motion, useAnimate } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { MEMORY_TIDE_MARK_SUCCESS } from "@/lib/memory-tide-events";

const RORY_MAIN = "/images/satyr-rory-main.png";

/**
 * Listens for successful Mark from Trace/Wish; shows mini Rory bottom-left dance (~3s) then fades out.
 */
export function RoryMarkCelebration() {
  const [runKey, setRunKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const busyRef = useRef(false);
  const [scope, animateScope] = useAnimate();

  const play = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setMounted(true);
    setRunKey((k) => k + 1);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const el = scope.current;
    if (!el) {
      busyRef.current = false;
      setMounted(false);
      return;
    }

    try {
      el.style.opacity = "0";
      el.style.transform = "scale(0.88) rotate(0deg) translateY(0px)";
      await animateScope(el, { opacity: 1, scale: 1 }, { duration: 0.38, ease: [0.22, 1, 0.36, 1] });
      await animateScope(
        el,
        {
          rotate: 360,
          y: [0, -10, 0, -10, 0, -10, 0],
        },
        { duration: 3, ease: "easeInOut" },
      );
      await animateScope(el, { opacity: 0, scale: 0.92 }, { duration: 0.48, ease: [0.22, 1, 0.36, 1] });
    } finally {
      busyRef.current = false;
      setMounted(false);
    }
  }, [animateScope, scope]);

  useEffect(() => {
    const onMark = () => {
      void play();
    };
    window.addEventListener(MEMORY_TIDE_MARK_SUCCESS, onMark);
    return () => window.removeEventListener(MEMORY_TIDE_MARK_SUCCESS, onMark);
  }, [play]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-5 z-[200] select-none" aria-hidden>
      <motion.div
        key={runKey}
        ref={scope}
        className="origin-bottom"
        style={{ height: 80 }}
        initial={false}
      >
        <Image
          src={RORY_MAIN}
          alt=""
          width={96}
          height={120}
          className="memory-tide-rory-ethereal h-[80px] w-auto object-contain object-bottom"
          unoptimized
        />
      </motion.div>
    </div>
  );
}
