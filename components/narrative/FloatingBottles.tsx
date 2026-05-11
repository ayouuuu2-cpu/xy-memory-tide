"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import type { BottleMessage } from "@/data/narrative-content";
import { NarrativeWhisperCard } from "./NarrativeWhisperCard";

type Props = {
  active: boolean;
  messages: BottleMessage[];
};

function BottleShape({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 48 72" className="h-16 w-11 drop-shadow-[0_4px_12px_rgba(100,160,220,0.25)]" aria-hidden>
      <defs>
        <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="50%" stopColor="rgba(200,230,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </linearGradient>
        <radialGradient id="innerGlow" cx="40%" cy="55%" r="50%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        fill="url(#glass)"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.8"
        d="M24 4c-4 0-8 3-8 8v6c0 2-2 4-3 7l-4 28c-1 6 4 11 15 11s16-5 15-11l-4-28c-1-3-3-5-3-7v-6c0-5-4-8-8-8z"
      />
      <ellipse cx="24" cy="44" rx="10" ry="14" fill="url(#innerGlow)" />
      <path
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
        d="M18 20 Q24 24 30 20"
      />
    </svg>
  );
}

export function FloatingBottles({ active, messages }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const activeMsg = useMemo(() => messages.find((m) => m.id === openId) ?? null, [messages, openId]);

  const bottles = useMemo(() => {
    const sides = [
      { leftPct: 6, topPct: 18 },
      { leftPct: 10, topPct: 62 },
      { leftPct: 82, topPct: 24 },
      { leftPct: 88, topPct: 58 },
      { leftPct: 4, topPct: 42 },
    ];
    return messages.slice(0, sides.length).map((m, i) => ({
      ...m,
      ...sides[i % sides.length],
      duration: 36 + (i % 3) * 8,
      delay: i * 1.8,
    }));
  }, [messages]);

  const close = useCallback(() => setOpenId(null), []);

  if (!active) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[12] overflow-hidden">
        {bottles.map((b, i) => (
          <motion.button
            key={b.id}
            type="button"
            aria-label="Floating memory bottle"
            className="pointer-events-auto absolute opacity-[0.42] transition hover:opacity-[0.72]"
            style={{ left: `${b.leftPct}%`, top: `${b.topPct}%` }}
            initial={{ x: 0, y: 0, rotate: -4 + i * 2 }}
            animate={{
              x: [0, 28, -12, 0],
              y: [0, -18, 10, 0],
              rotate: [-3 + i, 4 - i, -2],
            }}
            transition={{
              duration: b.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: b.delay,
            }}
            onClick={() => setOpenId(b.id)}
            whileHover={{ scale: 1.06 }}
          >
            <BottleShape glow={i % 2 === 0 ? "#ffd4c4" : "#c8e8ff"} />
          </motion.button>
        ))}
      </div>

      <NarrativeWhisperCard open={!!activeMsg} onClose={close} title="MEMORY">
        {activeMsg?.text}
      </NarrativeWhisperCard>
    </>
  );
}
