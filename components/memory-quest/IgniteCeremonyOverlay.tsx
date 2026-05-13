"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { burstIgniteCeremonyAt, burstPaperUnlockAt } from "@/lib/rory-confetti";
import { RORY_TYPING } from "@/lib/rory-assets";

const THUMB = 44;
const CELEBRATE_MSG = "恭喜解锁！";

type Phase = "idle" | "celebrate" | "flying";

type Props = {
  open: boolean;
  wishId: string;
  getMarkerScreen: () => { x: number; y: number } | null;
  onCancel: () => void;
  onStruck?: () => void;
  onStrikeComplete: () => Promise<void>;
};

/** Wish→Trace：手帐感滑轨确认 → 纸屑 + Rory 打字 → 光点飞向地图星 → 烟花与落库 */
export function IgniteCeremonyOverlay({ open, wishId, getMarkerScreen, onCancel, onStruck, onStrikeComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragPx, setDragPx] = useState(0);
  const dragStartRef = useRef<{ clientX: number; offset: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const maxDragRef = useRef(160);
  const [flame, setFlame] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const flightDoneRef = useRef(false);
  const strikeSentRef = useRef(false);
  const [typedLen, setTypedLen] = useState(0);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setDragPx(0);
      dragStartRef.current = null;
      setFlame(null);
      flightDoneRef.current = false;
      strikeSentRef.current = false;
      setTypedLen(0);
      return;
    }
    flightDoneRef.current = false;
    strikeSentRef.current = false;
  }, [open, wishId]);

  const runFlight = useCallback(() => {
    const box = panelRef.current?.getBoundingClientRect();
    const target = getMarkerScreen();
    if (!box || !target) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.38;
      setFlame({ x0: cx, y0: cy, x1: cx, y1: cy });
    } else {
      setFlame({
        x0: box.left + box.width * 0.5,
        y0: box.top + box.height * 0.55,
        x1: target.x,
        y1: target.y,
      });
    }
    setPhase("flying");
  }, [getMarkerScreen]);

  const finishCeremony = useCallback(async () => {
    if (flightDoneRef.current) return;
    flightDoneRef.current = true;
    const t = getMarkerScreen();
    if (t) burstIgniteCeremonyAt(t.x, t.y);
    else burstIgniteCeremonyAt(window.innerWidth / 2, window.innerHeight * 0.38);
    try {
      await onStrikeComplete();
    } catch {
      /* parent */
    }
  }, [getMarkerScreen, onStrikeComplete]);

  const commitIfThreshold = useCallback(
    (px: number) => {
      if (strikeSentRef.current) return true;
      const max = Math.max(80, maxDragRef.current);
      if (px < max * 0.88) return false;
      dragStartRef.current = null;
      strikeSentRef.current = true;
      setDragPx(max);
      onStruck?.();
      const box = panelRef.current?.getBoundingClientRect();
      if (box) burstPaperUnlockAt(box.left + box.width * 0.5, box.top + box.height * 0.52);
      else burstPaperUnlockAt(window.innerWidth * 0.5, window.innerHeight * 0.42);
      setPhase("celebrate");
      return true;
    },
    [onStruck],
  );

  useEffect(() => {
    if (phase !== "celebrate") return;
    const timers: number[] = [];
    let cancelled = false;
    let i = 0;

    const step = () => {
      if (cancelled) return;
      i += 1;
      setTypedLen(Math.min(i, CELEBRATE_MSG.length));
      if (i < CELEBRATE_MSG.length) {
        timers.push(window.setTimeout(step, 68 + (i % 3) * 8));
      } else {
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) runFlight();
          }, 420),
        );
      }
    };
    timers.push(window.setTimeout(step, 140));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, runFlight]);

  const onPointerDownThumb = (e: React.PointerEvent) => {
    if (phase !== "idle" || !open) return;
    const tr = trackRef.current?.getBoundingClientRect();
    if (!tr) return;
    maxDragRef.current = Math.max(0, tr.width - THUMB - 12);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { clientX: e.clientX, offset: dragPx };
  };

  const onPointerMoveThumb = (e: React.PointerEvent) => {
    if (phase !== "idle" || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const next = Math.max(0, Math.min(dragStartRef.current.offset + dx, maxDragRef.current));
    setDragPx(next);
    if (commitIfThreshold(next)) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
  };

  const onPointerUpThumb = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
    dragStartRef.current = null;
    if (!strikeSentRef.current) setDragPx(0);
  };

  const max = Math.max(80, maxDragRef.current);
  const progress = max > 0 ? Math.min(1, dragPx / max) : 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="ignite-root"
          role="dialog"
          aria-modal="true"
          aria-label="去拾遗"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[520] flex items-center justify-center bg-[#1c120c]/78 backdrop-blur-[5px]"
        >
          <button
            type="button"
            className="absolute right-5 top-5 rounded-full border border-[#c9a575]/45 bg-[#2a1f18]/75 px-3 py-1.5 text-sm text-[#f5e9d8]/95"
            onClick={onCancel}
          >
            先不了
          </button>

          <div
            ref={panelRef}
            className={`relative mx-4 w-[min(92vw,380px)] select-none rounded-[20px] border border-[#c9a575]/55 bg-[linear-gradient(165deg,#faf3e6_0%,#f0e4d2_48%,#e8dcc8_100%)] px-5 py-6 shadow-[0_18px_42px_rgba(25,14,8,0.38),inset_0_1px_0_rgba(255,255,255,0.55)] ${phase === "flying" ? "opacity-45" : ""}`}
          >
            <p className="text-center font-serif text-[17px] tracking-[0.02em] text-[#3d2b20]">成真了哦～去拾遗</p>
            {phase === "idle" ? (
              <p className="mt-1 text-center text-[12px] text-[#6b5344]/88">把绳结拖到墨迹那头</p>
            ) : null}

            {phase === "idle" ? (
              <div className="mt-5">
                <div
                  ref={trackRef}
                  className="relative rotate-[-0.35deg] rounded-[14px] border border-dashed border-[#a08060]/45 bg-[#e8dcc8]/85 p-2 shadow-[inset_0_2px_8px_rgba(55,35,18,0.12)]"
                >
                  <div className="relative h-[52px] overflow-hidden rounded-[10px] border border-[#b69872]/35 bg-[#dbc9b0] shadow-[inset_0_3px_10px_rgba(45,28,14,0.14)]">
                    {/* 墨线填充 */}
                    <div
                      className="pointer-events-none absolute left-2 top-1/2 h-[5px] max-w-[calc(100%-16px)] -translate-y-1/2 rounded-full bg-[#3d2b20]/22 transition-[width] duration-75"
                      style={{
                        width: `${8 + progress * (100 - 16)}%`,
                      }}
                    />
                    {/* 虚线针脚 */}
                    <div
                      className="pointer-events-none absolute left-3 right-3 top-1/2 h-0 -translate-y-1/2 border-t border-dotted border-[#5c4330]/22"
                      aria-hidden
                    />
                    <motion.button
                      type="button"
                      aria-label="拖到右边确认去拾遗"
                      disabled={phase !== "idle"}
                      className="absolute top-1/2 left-[6px] flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-full border-2 border-[#f5e9dc] bg-[#7a2a2a] shadow-[inset_0_-5px_10px_rgba(0,0,0,0.28),0_4px_0_#4a1818,0_6px_14px_rgba(30,10,8,0.35)] active:cursor-grabbing disabled:opacity-55"
                      style={{ transform: `translate(${dragPx}px, -50%)` }}
                      onPointerDown={onPointerDownThumb}
                      onPointerMove={onPointerMoveThumb}
                      onPointerUp={onPointerUpThumb}
                      onPointerCancel={onPointerUpThumb}
                    >
                      <span className="text-[11px] text-[#f5e6dc]/95" aria-hidden>
                        ❧
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : null}

            {phase === "celebrate" ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 0.82, 0.12, 1] }}
                className="mt-6 flex items-end gap-3"
              >
                <Image
                  src={RORY_TYPING}
                  alt=""
                  width={100}
                  height={100}
                  className="h-[92px] w-auto shrink-0 object-contain drop-shadow-[0_6px_12px_rgba(40,22,12,0.25)]"
                  draggable={false}
                />
                <div className="min-h-[3rem] flex-1 rounded-[12px] border border-[#c4a574]/5 bg-[#faf6ec]/95 px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(90,60,30,0.06)]">
                  <p className="font-serif text-[17px] leading-relaxed tracking-[0.06em] text-[#3d2b20]">
                    {CELEBRATE_MSG.slice(0, typedLen)}
                    {typedLen < CELEBRATE_MSG.length ? (
                      <span className="ml-0.5 inline-block w-[2px] translate-y-px animate-pulse bg-[#3d2b20]/75" aria-hidden>
                        &nbsp;
                      </span>
                    ) : null}
                  </p>
                </div>
              </motion.div>
            ) : null}
          </div>

          {phase === "flying" && flame ? (
            <motion.div
              className="pointer-events-none fixed z-[530] h-6 w-6 rounded-full bg-gradient-to-br from-amber-100 via-orange-300 to-rose-500 shadow-[0_0_22px_rgba(255,170,70,0.9),0_0_40px_rgba(200,80,40,0.45)]"
              style={{ left: flame.x0 - 12, top: flame.y0 - 12 }}
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{
                left: flame.x1 - 12,
                top: flame.y1 - 12,
                scale: [0.7, 1.12, 0.88],
                opacity: [1, 1, 0.28],
              }}
              transition={{ duration: 0.72, ease: [0.22, 0.82, 0.18, 1] }}
              onAnimationComplete={() => {
                void finishCeremony();
              }}
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
