"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCelestial } from "@/contexts/CelestialContext";
import { burstMemoryTideStars } from "@/lib/rory-confetti";
import {
  RORY_SIDEBAR_CELEBRATE,
  RORY_SIDEBAR_IDLE,
  RORY_SIDEBAR_SLEEPY,
  RORY_TYPING,
} from "@/lib/rory-assets";
import { isRoryMemorySleepy } from "@/lib/rory-memory-stale";
import {
  RORY_STATIONERY_CELEBRATE,
  RORY_STATIONERY_CLOSE,
  RORY_STATIONERY_OPEN,
  RORY_STATIONERY_TYPING,
} from "@/lib/rory-stationery-events";
import { touchRoryActivity } from "@/lib/rory-activity";

const IDLE_TIPS = [
  "慢慢写也没关系，记忆会等你。",
  "今天的天空，有没有一点像那天？",
  "点一颗星，就像把心事轻轻放下。",
  "照片和声音，都可以是时间的折角。",
];

function birthdayLine(mode: "virgo" | "scorpio") {
  if (mode === "virgo") return "处女座星日快乐 ✨ 愿你的拾遗都温柔落地。";
  return "天蝎座的夜很深 ✨ 未竟也会变成光。";
}

/**
 * 侧栏 Rory：Idle / Sleepy（localStorage 超过约 3 天无拾遗/未竟相关互动）/ Typing / Celebrate。
 */
export function RorySidebarCompanion() {
  const { celestialBirthday } = useCelestial();
  const [tipIndex, setTipIndex] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [stationeryOpen, setStationeryOpen] = useState(false);
  const stationeryOpenRef = useRef(false);
  const [typingActive, setTypingActive] = useState(false);
  const typingClearRef = useRef<number | null>(null);
  const [celebrateUntil, setCelebrateUntil] = useState(0);
  const [sleepy, setSleepy] = useState(false);

  const bump = useCallback(() => {
    setPulse((n) => n + 1);
    if (!celestialBirthday) setTipIndex((i) => (i + 1) % IDLE_TIPS.length);
  }, [celestialBirthday]);

  useEffect(() => {
    const onAct = () => bump();
    window.addEventListener("memory-tide-rory-activity", onAct);
    return () => window.removeEventListener("memory-tide-rory-activity", onAct);
  }, [bump]);

  useEffect(() => {
    const tick = () => setSleepy(isRoryMemorySleepy());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    stationeryOpenRef.current = stationeryOpen;
  }, [stationeryOpen]);

  useEffect(() => {
    const onOpen = () => {
      setStationeryOpen(true);
      setTypingActive(false);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      touchRoryActivity();
    };
    const onClose = () => {
      setStationeryOpen(false);
      setTypingActive(false);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
    };
    const onTyping = () => {
      setTypingActive(true);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      typingClearRef.current = window.setTimeout(() => {
        if (!stationeryOpenRef.current) setTypingActive(false);
      }, 950);
    };
    const onCelebrate = () => {
      setCelebrateUntil(Date.now() + 2800);
      burstMemoryTideStars();
      touchRoryActivity();
    };
    window.addEventListener(RORY_STATIONERY_OPEN, onOpen);
    window.addEventListener(RORY_STATIONERY_CLOSE, onClose);
    window.addEventListener(RORY_STATIONERY_TYPING, onTyping);
    window.addEventListener(RORY_STATIONERY_CELEBRATE, onCelebrate);
    return () => {
      window.removeEventListener(RORY_STATIONERY_OPEN, onOpen);
      window.removeEventListener(RORY_STATIONERY_CLOSE, onClose);
      window.removeEventListener(RORY_STATIONERY_TYPING, onTyping);
      window.removeEventListener(RORY_STATIONERY_CELEBRATE, onCelebrate);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
    };
  }, []);

  const line = useMemo(() => {
    if (celestialBirthday) return birthdayLine(celestialBirthday);
    return IDLE_TIPS[tipIndex % IDLE_TIPS.length]!;
  }, [celestialBirthday, tipIndex]);

  const celebrating = Date.now() < celebrateUntil;
  const roryArt = useMemo(() => {
    if (stationeryOpen && typingActive) return RORY_TYPING;
    if (celebrating || celestialBirthday) return RORY_SIDEBAR_CELEBRATE;
    if (sleepy) return RORY_SIDEBAR_SLEEPY;
    return RORY_SIDEBAR_IDLE;
  }, [celebrating, celestialBirthday, stationeryOpen, typingActive, sleepy]);

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-20 flex max-w-[min(280px,85vw)] flex-col items-end gap-1.5 sm:right-3 sm:top-3">
      <motion.div
        key={roryArt}
        initial={{ opacity: 0, y: 4, scale: 0.94 }}
        animate={
          stationeryOpen && typingActive
            ? {
                opacity: 1,
                y: 0,
                scale: 1,
                x: [0, -5, 5, -4, 4, 0],
                rotate: [0, -2.5, 2.5, 0],
              }
            : { opacity: 1, y: 0, scale: 1, x: 0, rotate: 0 }
        }
        transition={
          stationeryOpen && typingActive
            ? { duration: 1.25, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
        }
        className="drop-shadow-[0_6px_18px_rgba(40,20,80,0.45)]"
      >
        <Image
          src={roryArt}
          alt=""
          width={80}
          height={80}
          className="memory-tide-rory-ethereal h-[76px] w-auto max-w-[88px] object-contain object-bottom"
          unoptimized
          priority={false}
        />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${line}-${pulse}`}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif rounded-2xl border border-violet-300/35 bg-violet-950/55 px-3 py-2 text-[13px] font-medium leading-snug text-violet-50 shadow-[0_8px_28px_rgba(30,18,60,0.55)] backdrop-blur-sm"
        >
          {line}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
