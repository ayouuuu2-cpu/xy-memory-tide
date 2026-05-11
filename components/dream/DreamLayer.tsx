"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { FloatingBottles } from "@/components/narrative/FloatingBottles";
import { HOME_MIST_BG } from "@/lib/memory-tide-assets";
import { NarrativeWhisperCard } from "@/components/narrative/NarrativeWhisperCard";
import { BOTTLE_MESSAGES_DREAM, EASTER_WHISPERS_DREAM } from "@/data/narrative-content";

const FRAGMENTS = [
  {
    id: "f1",
    label: "Echo",
    body: "光离开房间之后，还有一种很轻的感觉留着，像回声慢慢变远。",
  },
  {
    id: "f2",
    label: "Drift",
    body: "不是某个地点，更像胸口那一小块温度，慢慢地、很安静地在那里。",
  },
  {
    id: "f3",
    label: "Hush",
    body: "有些话差点说出口，后来都叠进夜色里了。",
  },
  {
    id: "f4",
    label: "Tide",
    body: "记忆像天气，会自己回来，不必敲门。",
  },
] as const;

type Props = {
  onHome: () => void;
};

export function DreamLayer({ onHome }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperText, setWhisperText] = useState("");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(() => FRAGMENTS.find((f) => f.id === activeId) ?? null, [activeId]);

  const orbs = useMemo(
    () =>
      FRAGMENTS.map((f, i) => ({
        ...f,
        x: 18 + (i * 22) % 70,
        y: 22 + ((i * 37) % 55),
        delay: i * 0.2,
      })),
    [],
  );

  const closeFragment = useCallback(() => setActiveId(null), []);

  const clearPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const startHintPress = useCallback(() => {
    clearPress();
    pressTimer.current = setTimeout(() => {
      const line =
        EASTER_WHISPERS_DREAM[Math.floor(Math.random() * EASTER_WHISPERS_DREAM.length)] ??
        EASTER_WHISPERS_DREAM[0];
      setWhisperText(line);
      setWhisperOpen(true);
      pressTimer.current = null;
    }, 820);
  }, [clearPress]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image src={HOME_MIST_BG} alt="" fill className="object-cover object-center" sizes="100vw" priority quality={90} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/[0.06] via-transparent to-rose-950/15"
        aria-hidden
      />
      <FloatingBottles active messages={BOTTLE_MESSAGES_DREAM} />

      <motion.div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 70% 60%, rgba(200,220,255,0.45), transparent)",
          backgroundSize: "120px 120px, 90px 90px",
        }}
        animate={{ backgroundPosition: ["0% 0%", "4% 3%", "0% 0%"] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full bg-violet-300/10 blur-3xl"
          style={{
            width: `${28 + i * 12}%`,
            height: `${22 + i * 8}%`,
            left: `${i * 25}%`,
            top: `${10 + i * 18}%`,
          }}
          animate={{ y: [0, -24, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 12 + i * 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
        />
      ))}

      {orbs.map((o) => (
        <motion.button
          key={o.id}
          type="button"
          className="absolute z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/25 bg-gradient-to-b from-white/15 to-violet-500/10 text-[10px] font-bold uppercase tracking-widest text-violet-100/90 shadow-[0_0_32px_rgba(200,180,255,0.35)] backdrop-blur-sm"
          style={{ left: `${o.x}%`, top: `${o.y}%` }}
          onClick={() => setActiveId(o.id)}
          whileHover={{ scale: 1.08, boxShadow: "0 0 48px rgba(220,200,255,0.5)" }}
          whileTap={{ scale: 0.95 }}
          animate={{ y: [0, -10, 0] }}
          transition={{
            y: { duration: 5 + o.delay, repeat: Infinity, ease: "easeInOut", delay: o.delay },
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
        >
          {o.label}
        </motion.button>
      ))}

      <motion.button
        type="button"
        onClick={onHome}
        className="absolute right-8 top-8 z-30 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100/90 backdrop-blur-md transition hover:bg-white/15"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        Home
      </motion.button>

      <p
        className="pointer-events-auto absolute bottom-10 left-1/2 max-w-md -translate-x-1/2 cursor-default select-none text-center text-[11px] font-medium leading-relaxed text-violet-200/45"
        onPointerDown={startHintPress}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
      >
        Dream layer — no map, no coordinates. Tap a floating fragment.
        <span className="mt-2 block text-[10px] text-violet-300/30">（轻轻按住这行字，也许会漂来一句。）</span>
      </p>

      <NarrativeWhisperCard open={whisperOpen} onClose={() => setWhisperOpen(false)} title="—">
        {whisperText}
      </NarrativeWhisperCard>

      <AnimatePresence>
        {active && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFragment}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className="max-w-md rounded-3xl border border-white/20 bg-gradient-to-b from-[#2a2240]/95 to-[#1a1428]/95 px-8 py-7 shadow-[0_0_60px_rgba(180,160,255,0.25)]"
              initial={{ scale: 0.88, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-300/70">
                {active.label}
              </p>
              <p className="mt-4 text-base leading-relaxed text-violet-50/90">{active.body}</p>
              <button
                type="button"
                onClick={closeFragment}
                className="mt-6 text-sm font-semibold text-violet-300/80 hover:text-violet-200"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
