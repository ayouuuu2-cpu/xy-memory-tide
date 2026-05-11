"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type LocalTrack = { src: string; title: string };

/** Static playlist — `public/music1.mp3` & `public/music2.mp3` (served from `/`). */
const PUBLIC_MUSIC_TRACKS: LocalTrack[] = [
  { src: "/music1.mp3", title: "HAAN — 왜 자꾸 생각날까 (Stuck in My Head)" },
  { src: "/music2.mp3", title: "Chan — 칸예보다 너 (feat. Gist)" },
];

function pickRandomIndex(length: number, exclude?: number): number {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  let guard = 0;
  while (idx === exclude && guard++ < 16) {
    idx = Math.floor(Math.random() * length);
  }
  return idx;
}

type Hint = "on" | "off" | null;

/**
 * Local BGM from `/public/*.mp3`. Play/pause follows real `HTMLMediaElement` events (no hydration flash).
 */
export function GlobalMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const hintTimerRef = useRef<number | null>(null);
  const tracksRef = useRef(PUBLIC_MUSIC_TRACKS);

  const [mounted, setMounted] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  /** User intent — false until first Play (autoplay policy). */
  const [intentPlaying, setIntentPlaying] = useState(false);
  /** Mirrors element — updated from `play` / `pause` / `playing` / `error` / `ended`. */
  const [surfacePlaying, setSurfacePlaying] = useState(false);
  const [hint, setHint] = useState<Hint>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 26 });
  const sy = useSpring(my, { stiffness: 220, damping: 26 });

  const tracks = PUBLIC_MUSIC_TRACKS;
  const current = tracks[trackIndex];
  const currentUrl = current?.src ?? "";

  tracksRef.current = tracks;

  const visualPlaying = intentPlaying && surfacePlaying;

  const flashHint = useCallback((next: Exclude<Hint, null>) => {
    if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
    setHint(next);
    hintTimerRef.current = window.setTimeout(() => {
      setHint(null);
      hintTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !mounted) return;

    const syncFromElement = () => {
      setSurfacePlaying(!a.paused && !a.ended);
    };

    const onPlay = () => setSurfacePlaying(true);
    const onPause = () => setSurfacePlaying(false);
    const onPlaying = () => setSurfacePlaying(true);
    const onEnded = () => {
      setSurfacePlaying(false);
      setTrackIndex((cur) => pickRandomIndex(tracksRef.current.length, cur));
    };
    const onError = () => {
      setSurfacePlaying(false);
      setIntentPlaying(false);
      flashHint("off");
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    syncFromElement();

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [mounted, flashHint]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentUrl) return;

    a.volume = 0.82;
    a.preload = "auto";

    const resolved = new URL(currentUrl, window.location.origin).href;
    if (a.src !== resolved) {
      a.src = currentUrl;
    }

    if (!intentPlaying) {
      a.pause();
      return;
    }

    void a.play().catch(() => {
      setSurfacePlaying(false);
      setIntentPlaying(false);
      flashHint("off");
    });
  }, [currentUrl, intentPlaying, flashHint]);

  const resetMagnet = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  useEffect(() => {
    if (!mounted) return;

    const onMove = (e: MouseEvent) => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const pull = Math.min(14, 280 / (len + 28));
      mx.set((dx / len) * pull);
      my.set((dy / len) * pull);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("blur", resetMagnet);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("blur", resetMagnet);
    };
  }, [mounted, mx, my, resetMagnet]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !currentUrl) return;

    if (intentPlaying) {
      setIntentPlaying(false);
      a.pause();
      flashHint("off");
      return;
    }

    setIntentPlaying(true);
    flashHint("on");
    void a.play().catch(() => {
      setIntentPlaying(false);
      setSurfacePlaying(false);
      flashHint("off");
    });
  }, [intentPlaying, currentUrl, flashHint]);

  if (!mounted) {
    return (
      <div
        className="pointer-events-none fixed bottom-6 left-4 z-[80] flex h-9 w-9 items-center justify-center sm:bottom-7 sm:left-5"
        aria-hidden
      >
        <span className="text-xl text-rose-100/35 saturate-[0.85]">🎵</span>
      </div>
    );
  }

  return (
    <>
      <audio ref={audioRef} className="hidden" playsInline preload="metadata" />

      <AnimatePresence mode="wait">
        {hint ? (
          <motion.div
            key={hint}
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: [0.25, 0.5, 0.25, 1] }}
            className="pointer-events-none fixed bottom-[3.85rem] left-3 z-[81] max-w-[min(92vw,260px)] rounded-full border border-rose-200/20 bg-rose-950/35 px-3 py-1.5 text-[10px] font-medium tracking-wide text-rose-100/75 shadow-[0_0_18px_rgba(251,207,232,0.12)] backdrop-blur-md saturate-[0.88] sm:bottom-[4.35rem] sm:left-4"
          >
            {hint === "on" ? (
              <>
                Music on
                {current?.title ? (
                  <span className="mt-0.5 block truncate font-normal text-rose-50/55">{current.title}</span>
                ) : null}
              </>
            ) : (
              "Paused"
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={!currentUrl}
        style={{ x: sx, y: sy }}
        aria-label={visualPlaying ? "Pause music" : "Play music"}
        aria-pressed={visualPlaying}
        title={visualPlaying ? "Pause music" : "Play music"}
        className="pointer-events-auto fixed bottom-6 left-4 z-[80] flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/22 bg-rose-950/28 text-rose-50 backdrop-blur-md transition-colors hover:border-rose-200/35 hover:bg-rose-950/38 disabled:cursor-not-allowed disabled:opacity-35 saturate-[0.88] sm:bottom-7 sm:left-5"
        onMouseLeave={resetMagnet}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <motion.span
          className="relative inline-flex origin-center select-none items-center justify-center text-xl leading-none"
          animate={{
            rotate: 0,
            opacity: visualPlaying ? 1 : 0.38,
            scale: visualPlaying ? 1 : 0.98,
            filter: visualPlaying
              ? [
                  "drop-shadow(0 0 4px rgba(253,230,240,0.35))",
                  "drop-shadow(0 0 10px rgba(244,180,200,0.28))",
                  "drop-shadow(0 0 5px rgba(252,220,232,0.3))",
                  "drop-shadow(0 0 4px rgba(253,230,240,0.35))",
                ]
              : "drop-shadow(0 0 0 transparent)",
          }}
          transition={{
            opacity: { duration: 0.45, ease: [0.25, 0.55, 0.25, 1] },
            scale: { duration: 0.45, ease: [0.25, 0.55, 0.25, 1] },
            filter: visualPlaying
              ? { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.45, ease: [0.25, 0.55, 0.25, 1] },
          }}
        >
          <span className={`inline-block ${visualPlaying ? "animate-spin-slow" : ""}`}>🎵</span>
        </motion.span>
      </motion.button>
    </>
  );
}
