"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { HOME_MIST_BG } from "@/lib/memory-tide-assets";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CelestialTitleCluster } from "@/components/intro/CelestialTitleCluster";
import { EternalDaysPanel } from "@/components/eternal-days/EternalDaysPanel";
import { MemoryTideBackground } from "@/components/memory-tide/MemoryTideBackground";
import { useWhisperPlayback } from "@/contexts/WhisperPlaybackContext";
import { ensureDefaultAnchor, getDaysSinceAnchor } from "@/lib/eternal-days";

type Props = {
  /** Optional: opens the Earth / Dream hub after load. */
  onEnterPark?: () => void;
};

const RORY_MAIN = "/images/satyr-rory-main.png";
const BAR_SEC = 2.5;
const BAR_DELAY = 0;

function SoftCloudPlatform({ className }: { className?: string }) {
  const uid = useId();
  const gid = `${uid}-cloudGrad`;

  return (
    <svg
      className={className}
      viewBox="0 0 280 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.52)" />
          <stop offset="100%" stopColor="rgba(190,205,255,0.28)" />
        </linearGradient>
        {/* stdDeviation in user units: ~13 on a 100-tall viewBox wipes the shape; 4–5 reads as soft mist. */}
        <filter id={`${uid}-blur`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>
      <g transform="translate(140, 66) scale(1.32, 1) translate(-140, -66)">
        <path
          d="M48 62 Q22 62 14 42 Q6 22 26 14 Q46 6 68 14 Q88 4 118 10 Q148 4 178 12 Q206 6 232 16 Q252 10 262 28 Q272 42 252 58 Q242 68 218 62 Q228 80 204 86 Q178 92 150 86 Q122 92 94 86 Q66 92 42 86 Q18 80 10 66 Q4 52 48 62Z"
          fill={`url(#${gid})`}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.25"
          filter={`url(#${uid}-blur)`}
        />
      </g>
    </svg>
  );
}

function PortalBubbleLink({
  href,
  ready,
  title,
  subtitle,
  accentClass,
}: {
  href: string;
  ready: boolean;
  title: string;
  subtitle: string;
  accentClass: string;
}) {
  const inner = (
    <>
      <span className="pointer-events-none absolute -left-1 -top-1 opacity-80">
        <Sparkles className="h-5 w-5 text-amber-200/55" strokeWidth={2} aria-hidden />
      </span>
      <span className="pointer-events-none absolute -right-1 -top-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-200/45 to-transparent blur-sm" />
      <span className="font-display relative z-10 block text-lg font-extrabold tracking-tight text-[#fff8fc]">{title}</span>
      <span className="relative z-10 mt-1 block font-display text-[11px] font-semibold italic text-violet-200/65">{subtitle}</span>
    </>
  );

  const className = [
    "memory-tide-level-btn relative z-50 flex min-h-[4.75rem] min-w-[11.5rem] flex-col items-center justify-center rounded-full border-2 px-8 py-4 text-center backdrop-blur-[12px] transition",
    ready
      ? `memory-tide-level-btn--active cursor-pointer shadow-[0_0_26px_rgba(255,220,200,0.22)] ${accentClass}`
      : "cursor-not-allowed border-white/10 bg-white/[0.04] text-violet-300/35 opacity-45 shadow-none backdrop-blur-sm",
  ].join(" ");

  if (!ready) {
    return (
      <span aria-disabled className={className}>
        {inner}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function DreamOpeningLoader({ onEnterPark }: Props) {
  const { isPlaying } = useWhisperPlayback();
  const [imgOk, setImgOk] = useState(true);
  const [ready, setReady] = useState(false);
  const [pctLabel, setPctLabel] = useState(0);
  const [daysCount, setDaysCount] = useState(0);
  const [eternalOpen, setEternalOpen] = useState(false);
  const progress = useMotionValue(0);
  const widthPct = useTransform(progress, [0, 100], ["0%", "100%"]);

  useMotionValueEvent(progress, "change", (v) => {
    setPctLabel(Math.round(v));
  });

  useEffect(() => {
    const controls = animate(progress, 100, {
      delay: BAR_DELAY,
      duration: BAR_SEC,
      ease: "easeInOut",
      onComplete: () => setReady(true),
    });
    return () => controls.stop();
  }, [progress]);

  useEffect(() => {
    ensureDefaultAnchor();
    setDaysCount(getDaysSinceAnchor());
  }, []);

  const openEternalDays = () => {
    ensureDefaultAnchor();
    setDaysCount(getDaysSinceAnchor());
    setEternalOpen(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-x-hidden overflow-y-visible bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(14px)", scale: 1.02 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* z-0: mist + MemoryTide wash (internal z-0) & stardust/meteors (internal z-1), all non-interactive */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 z-0">
          <Image src={HOME_MIST_BG} alt="" fill className="object-cover object-center" priority sizes="100vw" quality={92} />
        </div>
        <div className="absolute inset-0 z-0">
          <MemoryTideBackground showSpotlight baseLayerMix={0.48} />
        </div>
      </div>

      {/* Rory + UI above background (no globe on cover). */}
      <div className="relative z-[110] box-border flex min-h-dvh min-h-0 flex-1 flex-col overflow-visible p-8">
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
          <motion.p
            className="pointer-events-none w-full max-w-xl shrink-0 text-center font-display text-xs font-medium uppercase tracking-[0.35em] text-[#e8e4ff]/90"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.5 }}
          >
            Loading memories...
          </motion.p>

          <div className="flex min-h-0 w-full flex-1 flex-col items-center pb-1 pt-1">
            <motion.div
              className="relative flex min-h-0 w-full max-w-[min(88vw,440px)] flex-1 flex-col justify-end overflow-visible"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="relative flex min-h-0 w-full flex-1 flex-col justify-end overflow-visible"
                animate={{ y: [-3, -8, -3] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Full-bleed character in flex slot — no scale (avoids clipping head); cloud is smaller decoration under feet */}
                <div className="relative min-h-0 w-full flex-1 overflow-visible">
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex min-h-[72px] justify-center px-1">
                    <SoftCloudPlatform className="h-[min(100px,22vw)] w-[min(92%,400px)] max-w-full shrink-0 opacity-[0.92] drop-shadow-[0_14px_36px_rgba(100,80,160,0.32)]" />
                  </div>
                  <button
                    type="button"
                    onClick={openEternalDays}
                    className="memory-tide-days-chip pointer-events-auto absolute bottom-[5%] right-[1%] z-[125] rounded-full border border-white/16 bg-[#0e1024]/62 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.14em] text-cyan-100/88 shadow-[0_0_22px_rgba(120,200,255,0.14)] backdrop-blur-md transition hover:border-cyan-200/38 hover:bg-white/[0.07]"
                    title="Days"
                  >
                    D+{daysCount}
                  </button>
                  <div className="relative z-10 flex h-full min-h-0 w-full cursor-pointer items-end justify-center overflow-visible px-[1%] pb-0 pt-2">
                    {imgOk ? (
                      <motion.div
                        className="origin-bottom will-change-transform"
                        animate={
                          isPlaying
                            ? { rotate: [0, 1.5, -1.2, 0], x: [0, 3, -2, 0], y: [0, -3, 0] }
                            : false
                        }
                        transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <motion.div
                          className="origin-bottom will-change-transform"
                          whileHover={{
                            rotate: -2.8,
                            skewX: -4,
                            scale: 1.028,
                            transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
                          }}
                        >
                          <Image
                            src={RORY_MAIN}
                            alt="Satyr Rory–inspired memory guide (original art)"
                            width={520}
                            height={620}
                            className="memory-tide-rory-ethereal pointer-events-none h-auto max-h-[min(58dvh,520px)] w-auto max-w-full object-contain object-bottom"
                            sizes="(max-width: 768px) 88vw, 440px"
                            priority
                            unoptimized
                            onError={() => setImgOk(false)}
                          />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div
                        className="mb-4 flex max-h-full w-[72%] items-end justify-center rounded-[42%_42%_48%_48%] border border-white/12 bg-gradient-to-b from-[#3a3560]/55 to-[#1f1a38]/78 text-center shadow-[0_22px_56px_rgba(0,0,0,0.45)]"
                        aria-hidden
                      >
                        <span className="mb-8 px-4 font-display text-xs text-violet-200/55">
                          Add <code className="text-violet-300/70">satyr-rory-main.png</code> to{" "}
                          <code className="text-violet-300/70">/public/images/</code>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="flex w-full max-w-xl shrink-0 flex-col items-center gap-2.5 pt-0">
            <div className="w-full max-w-xs px-1">
              <div className="memory-tide-home-progress relative h-2 overflow-hidden rounded-full border border-white/15 bg-[#1a1530]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[12px]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6b7fd8] via-[#c9a8e8] to-[#ffd8a8]"
                  style={{ width: widthPct }}
                />
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/28 to-transparent"
                  style={{ width: widthPct }}
                />
              </div>
              <p className="mt-1 text-center font-mono text-[10px] tracking-widest text-violet-200/75">{pctLabel}%</p>
            </div>

            <CelestialTitleCluster />

            <div className="flex w-full flex-col items-center gap-2">
              <motion.div
                className="flex w-full flex-col items-center justify-center gap-5 sm:flex-row sm:gap-9"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: ready ? 1 : 0.35, y: ready ? 0 : 8 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <PortalBubbleLink
                  href="/trace"
                  ready={ready}
                  title="Trace"
                  subtitle="The tide of footprints"
                  accentClass="border-amber-200/45 bg-gradient-to-b from-white/[0.18] to-violet-900/28 text-white"
                />
                <PortalBubbleLink
                  href="/wish"
                  ready={ready}
                  title="Wish"
                  subtitle="The map of daydreams"
                  accentClass="border-violet-300/42 bg-gradient-to-b from-white/[0.14] to-indigo-950/38 text-[#f4f4ff]"
                />
              </motion.div>
              <div className="memory-tide-home-credit-inline pointer-events-none flex flex-col items-center">
                <span className="memory-tide-home-credit-names pointer-events-auto">Ziyu &amp; Yixin</span>
                <div className="memory-tide-home-credit-line mt-1" aria-hidden />
              </div>
            </div>

            {onEnterPark && (
              <motion.button
                type="button"
                className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-violet-700/80 underline decoration-dotted decoration-violet-400/45 underline-offset-[6px] transition hover:text-violet-900"
                initial={{ opacity: 0 }}
                animate={{ opacity: ready ? 1 : 0.35 }}
                disabled={!ready}
                onClick={() => ready && onEnterPark()}
              >
                Memory map &amp; dreams
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <EternalDaysPanel
        open={eternalOpen}
        onClose={() => {
          setEternalOpen(false);
          setDaysCount(getDaysSinceAnchor());
        }}
      />
    </motion.div>
  );
}
