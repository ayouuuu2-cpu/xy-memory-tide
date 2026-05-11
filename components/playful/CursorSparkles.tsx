"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Spark = { id: number; x: number; y: number };

/**
 * Occasional tiny sparkles near the cursor — subtle “stardust” without stealing focus.
 */
export function CursorSparkles() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const nextId = useRef(0);
  const throttle = useRef(0);

  const pushSpark = useCallback((x: number, y: number) => {
    const id = nextId.current++;
    setSparks((prev) => [...prev.slice(-14), { id, x, y }]);
    window.setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== id));
    }, 520);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - throttle.current < 240) return;
      if (Math.random() > 0.035) return;
      throttle.current = now;
      pushSpark(e.clientX, e.clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [pushSpark]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[75]" aria-hidden>
      <AnimatePresence>
        {sparks.map((s) => (
          <motion.span
            key={s.id}
            initial={{ opacity: 0.95, scale: 0.35, x: s.x - 6, y: s.y - 6 }}
            animate={{ opacity: 0, scale: 1.15, x: s.x - 6 + (Math.random() - 0.5) * 28, y: s.y - 18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.25, 0.55, 0.25, 1] }}
            className="pointer-events-none fixed left-0 top-0 text-[10px] text-amber-100/55 drop-shadow-[0_0_4px_rgba(255,240,220,0.35)]"
          >
            ✦
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
