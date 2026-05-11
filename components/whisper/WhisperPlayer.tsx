"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatAnnualDate, isAnniversaryToday } from "@/lib/eternal-days";
import { useWhisperPlayback } from "@/contexts/WhisperPlaybackContext";

export type WhisperAnniversary = { month: number; day: number };

type Props = {
  voiceNoteUrl: string | null | undefined;
  /** If set, voice only unlocks on this calendar day each year. */
  anniversary?: WhisperAnniversary | null;
  label?: string;
  className?: string;
  /** Compact card for inline lists. */
  compact?: boolean;
};

export function WhisperPlayer({ voiceNoteUrl, anniversary, label, className = "", compact }: Props) {
  const url = (voiceNoteUrl ?? "").trim();
  const { setPlaying, setVolumeFrame } = useWhisperPlayback();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setLocalPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const locked =
    Boolean(url) &&
    anniversary != null &&
    !isAnniversaryToday(anniversary.month, anniversary.day);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const teardownAudioGraph = useCallback(() => {
    stopRaf();
    try {
      srcRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    srcRef.current = null;
    analyserRef.current = null;
    try {
      void ctxRef.current?.close();
    } catch {
      /* ignore */
    }
    ctxRef.current = null;
  }, [stopRaf]);

  useEffect(() => {
    return () => {
      teardownAudioGraph();
      setPlaying(false);
    };
  }, [setPlaying, teardownAudioGraph]);

  const ensureGraph = useCallback((): boolean => {
    const el = audioRef.current;
    if (!el) return false;
    if (srcRef.current && analyserRef.current) return true;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;
    try {
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaElementSource(el);
      srcRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      return true;
    } catch {
      try {
        srcRef.current?.disconnect();
      } catch {
        /* ignore */
      }
      srcRef.current = null;
      analyserRef.current = null;
      try {
        void ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
      return false;
    }
  }, []);

  const tickAnalyser = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / (buf.length * 255);
      setVolumeFrame(Math.min(1, avg * 2.2));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [setVolumeFrame]);

  const startFakeMeter = useCallback(() => {
    const loop = () => {
      const el = audioRef.current;
      if (!el || el.paused) return;
      const t = Date.now() / 190;
      setVolumeFrame(0.12 + Math.abs(Math.sin(t)) * 0.42);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [setVolumeFrame]);

  const handlePlayPause = async () => {
    if (!url || locked) return;
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    stopRaf();
    const graphOk = ensureGraph();
    try {
      if (graphOk && ctxRef.current?.state === "suspended") await ctxRef.current.resume();
      await el.play();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (/^https?:\/\//i.test(url)) el.crossOrigin = "anonymous";
    else el.removeAttribute("crossorigin");
  }, [url]);

  useEffect(() => {
    setLocalPlaying(false);
    setProgress(0);
    setDuration(0);
    teardownAudioGraph();
    setPlaying(false);
  }, [url, setPlaying, teardownAudioGraph]);

  if (!url) return null;

  if (locked && anniversary) {
    return (
      <div
        className={`rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[0.8rem] text-white/75 ${className}`}
        role="status"
      >
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" aria-hidden />
          <div>
            <p className="font-medium text-white/90">{label ?? "Whisper"}</p>
            <p className="mt-1 text-white/60">
              This whisper is sleeping until {formatAnnualDate(anniversary.month, anniversary.day)}…
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ringSize = compact ? 44 : 56;
  const stroke = 3;
  const r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = duration > 0 ? progress / duration : 0;
  const dash = c * (1 - pct);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] ${compact ? "p-3" : "p-4"} ${className}`}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration;
          if (d && Number.isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el) setProgress(el.currentTime);
        }}
        onPlay={() => {
          setLocalPlaying(true);
          setPlaying(true);
          stopRaf();
          if (analyserRef.current) tickAnalyser();
          else startFakeMeter();
        }}
        onPause={() => {
          setLocalPlaying(false);
          setPlaying(false);
          stopRaf();
          setVolumeFrame(0);
        }}
        onEnded={() => {
          setLocalPlaying(false);
          setPlaying(false);
          stopRaf();
          setVolumeFrame(0);
          setProgress(0);
        }}
      />

      <AnimatePresence>
        {playing && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/25"
                initial={{ scale: 0.4, opacity: 0.45 }}
                animate={{ scale: 2.4 + i * 0.15, opacity: 0 }}
                transition={{ duration: 2.4 + i * 0.35, repeat: Infinity, ease: "easeOut", delay: i * 0.35 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-inner ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/60"
          aria-label={playing ? "Pause whisper" : "Play whisper"}
        >
          <svg width={ringSize} height={ringSize} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              fill="none"
              stroke="rgba(125,211,252,0.65)"
              strokeWidth={stroke}
              strokeDasharray={c}
              strokeDashoffset={dash}
              strokeLinecap="round"
            />
          </svg>
          {playing ? <Pause className="relative h-5 w-5" /> : <Play className="relative ml-0.5 h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          {label && <p className="truncate text-[0.85rem] font-medium text-white/90">{label}</p>}
          <p className="text-[0.72rem] text-white/45">Whisper</p>
        </div>
      </div>
    </div>
  );
}
