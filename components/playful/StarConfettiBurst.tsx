"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type Particle = { vx: number; vy: number; rot: number; delay: number; symbol: string };

const SYMBOLS = ["✦", "✧", "⋆", "·"];

export function StarConfettiBurst({
  origin,
  burstKey,
}: {
  origin: { x: number; y: number };
  burstKey: number;
}) {
  const particles = useMemo(() => {
    const list: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.5;
      const speed = 56 + Math.random() * 92;
      list.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 28,
        rot: (Math.random() - 0.5) * 220,
        delay: Math.random() * 0.06,
        symbol: SYMBOLS[i % SYMBOLS.length],
      });
    }
    return list;
  }, [burstKey]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[250]" aria-hidden>
      {particles.map((p, i) => (
        <motion.span
          key={`${burstKey}-${i}`}
          initial={{
            opacity: 1,
            scale: 0.45,
            x: origin.x,
            y: origin.y,
            rotate: 0,
          }}
          animate={{
            opacity: 0,
            scale: 0.95,
            x: origin.x + p.vx,
            y: origin.y + p.vy,
            rotate: p.rot,
          }}
          transition={{
            duration: 0.72,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="pointer-events-none fixed left-0 top-0 text-[13px] font-medium text-violet-100 drop-shadow-[0_0_8px_rgba(255,220,255,0.55)]"
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
}
