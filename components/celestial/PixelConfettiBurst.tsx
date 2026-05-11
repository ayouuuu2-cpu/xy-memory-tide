"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const MACARON = ["#ffd6e8", "#c9f0ff", "#fff5c8", "#e8d4ff", "#b8f5e8", "#ffc9d9"];

type Bit = { id: number; x: number; delay: number; dur: number; color: string; rot: number; size: number };

export function PixelConfettiBurst({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const bits = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: 8 + (i * 17) % 84,
      delay: (i % 10) * 0.02,
      dur: 1.35 + (i % 5) * 0.12,
      color: MACARON[i % MACARON.length],
      rot: (i * 47) % 360,
      size: 3 + (i % 3),
    })) as Bit[];
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[160] flex items-start justify-center overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute top-[18%] rounded-[1px]"
          style={{
            left: `${b.x}%`,
            width: b.size,
            height: b.size * 1.2,
            backgroundColor: b.color,
            boxShadow: `0 0 6px ${b.color}`,
          }}
          initial={{ y: 0, opacity: 1, rotate: b.rot, scale: 1 }}
          animate={{
            y: [0, 28 + (b.id % 8) * 12, 120 + (b.id % 12) * 18],
            x: [(b.id % 5) * 4 - 8, (b.id % 7) * 6 - 12, (b.id % 9) * 8 - 16],
            opacity: [1, 1, 0],
            rotate: b.rot + 180,
            scale: [1, 1.1, 0.6],
          }}
          transition={{ duration: b.dur, delay: b.delay, ease: [0.22, 0.61, 0.36, 1] }}
          onAnimationComplete={b.id === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
}
