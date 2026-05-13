"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { LandmarkMemory } from "@/data/memories";

type Props = {
  landmark: LandmarkMemory;
  onCloseToMap: () => void;
  /** After interstitial — panel entrance is staggered from this flag */
  revealReady: boolean;
};

const panelEase = [0.22, 1, 0.36, 1] as const;

function floatTilt(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ((h % 15) - 7) * 0.5;
}

function floatSlot(seed: string, index: number) {
  let h = 0;
  const key = `${seed}-${index}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return { left: 10 + (h % 58), top: 8 + ((h >>> 6) % 52) };
}

function AmbientBreath() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-2xl">
      <motion.div
        className="absolute -left-[20%] top-0 h-[90%] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(110,80,180,0.12),transparent_70%)] blur-3xl"
        animate={{ x: [0, 20, -8, 0], opacity: [0.5, 0.75, 0.55, 0.5] }}
        transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -right-[15%] bottom-0 h-[75%] w-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(50,90,160,0.08),transparent_72%)] blur-3xl"
        animate={{ x: [0, -16, 10, 0] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_120%,rgba(6,4,14,0.55),transparent_50%)]" />
    </div>
  );
}

/**
 * Layer 2 — read-only memory view: organic floating photos + soft text (no grid/list UI).
 */
export function YunnanMemoryRevealPanel({ landmark, onCloseToMap, revealReady }: Props) {
  const texts = landmark.texts ?? [];
  const images = landmark.images ?? [];
  const [hoverId, setHoverId] = useState<string | null>(null);

  const slots = useMemo(
    () => images.map((im, i) => ({ im, tilt: floatTilt(im.id), slot: floatSlot(im.id, i) })),
    [images],
  );

  return (
    <motion.div
      className="pointer-events-auto relative z-[165] flex h-[min(88dvh,820px)] w-[min(52rem,92vw)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(165deg,rgba(18,14,32,0.94)_0%,rgba(8,10,22,0.97)_55%,rgba(6,8,18,0.98)_100%)] shadow-[0_0_0_1px_rgba(120,100,180,0.06),0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={
        revealReady
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 28, scale: 0.98 }
      }
      transition={{ duration: 1.1, ease: panelEase }}
    >
      <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-7 py-5">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-400/60">Location</p>
          <h2 className="mt-1.5 font-display text-2xl font-medium tracking-[0.04em] text-[#faf8ff]/96">Yunnan</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-violet-200/55">云南省 · 中国</p>
          {landmark.date ? (
            <p className="mt-2 text-[11px] tracking-[0.08em] text-violet-300/50">{landmark.date}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCloseToMap}
          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-100/80 transition hover:border-violet-400/35 hover:bg-white/[0.07]"
        >
          Map
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-7 py-6">
        <AmbientBreath />

        <div className="relative z-[1] mb-10 min-h-[12rem]">
          {images.length > 0 ? (
            slots.map(({ im, tilt, slot }, index) => {
              const dim = hoverId !== null && hoverId !== im.id;
              const hov = hoverId === im.id;
              return (
                <motion.figure
                  key={im.id}
                  className="absolute w-[min(42%,11rem)]"
                  style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
                  initial={{ opacity: 0, scale: 0.88, rotate: tilt - 3, filter: "blur(10px)" }}
                  animate={
                    revealReady
                      ? {
                          opacity: dim ? 0.4 : 1,
                          scale: hov ? 1.05 : 1,
                          rotate: tilt,
                          y: hov ? -6 : 0,
                          filter: "blur(0px)",
                          zIndex: hov ? 3 : 1,
                        }
                      : { opacity: 0, filter: "blur(10px)" }
                  }
                  transition={{
                    delay: revealReady ? 0.28 + index * 0.16 : 0,
                    duration: 0.92,
                    ease: panelEase,
                  }}
                  onPointerEnter={() => setHoverId(im.id)}
                  onPointerLeave={() => setHoverId(null)}
                >
                  <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-black/25 shadow-[0_16px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(160,140,220,0.06)] backdrop-blur-[2px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={im.caption || "Memory"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  </div>
                  {im.caption ? (
                    <figcaption className="mt-2 max-w-[11rem] text-[10px] leading-snug text-violet-200/55">{im.caption}</figcaption>
                  ) : null}
                </motion.figure>
              );
            })
          ) : (
            <p className="flex min-h-[10rem] items-center justify-center text-center text-xs text-violet-400/40">
              No images yet — they will float here when present in the cloud.
            </p>
          )}
        </div>

        {texts.length > 0 ? (
          <div className="relative z-[1] space-y-8">
            {texts.map((line, i) => (
              <motion.p
                key={`${i}-${line.slice(0, 28)}`}
                className="max-w-prose text-[13px] leading-[1.85] text-violet-100/72"
                initial={{ opacity: 0, y: 12 }}
                animate={revealReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 0.45 + i * 0.18, duration: 0.82, ease: panelEase }}
              >
                {line}
              </motion.p>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
