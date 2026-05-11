"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type Star = { x: number; y: number; r: number; o: number; d: number };
type Sparkle = { x: number; y: number; s: number; rot: number; delay: number };
type Particle = { x: number; delay: number; dur: number; size: number };

function makeStars(n: number, seed = 0): Star[] {
  const out: Star[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.sin(i * 12.9898 + seed) * 43758.5453;
    const f = t - Math.floor(t);
    out.push({
      x: (Math.sin(i * 2.31 + seed) * 0.5 + 0.5) * 100,
      y: (Math.cos(i * 1.73 + seed) * 0.5 + 0.5) * 100,
      r: 0.5 + (f % 1) * 2.2,
      o: 0.12 + ((f * 6) % 1) * 0.55,
      d: 2.5 + ((f * 9) % 1) * 6,
    });
  }
  return out;
}

function makeSparkles(n: number): Sparkle[] {
  const out: Sparkle[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.sin(i * 9.1) * 10000;
    const f = t - Math.floor(t);
    out.push({
      x: (f * 97) % 100,
      y: ((f * 73 + i * 13) % 100),
      s: 5 + (f % 1) * 10,
      rot: f * 90,
      delay: f * 4,
    });
  }
  return out;
}

function makeParticles(n: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.sin(i * 7.7) * 8000;
    const f = t - Math.floor(t);
    out.push({
      x: (f * 100) % 100,
      delay: f * 12,
      dur: 14 + (f % 1) * 10,
      size: 2 + (f % 1) * 5,
    });
  }
  return out;
}

type Variant = "night" | "day";

type Props = {
  variant?: Variant;
  className?: string;
};

/**
 * Full-bleed dreamy backdrop: pearl gradients, clouds, stars, sparkles, soft particles.
 */
export function MemoryUniverse({ variant = "night", className = "" }: Props) {
  const stars = useMemo(() => makeStars(110, variant === "day" ? 2 : 0), [variant]);
  const sparkles = useMemo(() => makeSparkles(28), []);
  const particles = useMemo(() => makeParticles(22), []);

  const isDay = variant === "day";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Pearl + lavender depth */}
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? "radial-gradient(120% 100% at 50% 0%, #fffdf8 0%, #f5ecff 38%, #e8e4ff 72%, #ddd6ff 100%)"
            : "radial-gradient(130% 95% at 50% 15%, #2a1f4a 0%, #1a1538 28%, #12102c 55%, #0c0b1f 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: isDay
            ? "radial-gradient(ellipse 90% 70% at 20% 90%, rgba(255, 228, 240, 0.55) 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 85% 20%, rgba(200, 220, 255, 0.45) 0%, transparent 45%)"
            : "radial-gradient(ellipse 95% 75% at 15% 85%, rgba(180, 140, 220, 0.22) 0%, transparent 52%), radial-gradient(ellipse 85% 65% at 88% 18%, rgba(130, 170, 255, 0.18) 0%, transparent 48%)",
        }}
      />
      {/* Magical ocean floor glow */}
      <motion.div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          background: isDay
            ? "linear-gradient(180deg, transparent 0%, rgba(200, 230, 255, 0.25) 100%)"
            : "linear-gradient(180deg, transparent 35%, rgba(80, 120, 200, 0.12) 85%, rgba(40, 60, 120, 0.2) 100%)",
        }}
        animate={{ opacity: isDay ? [0.28, 0.38, 0.3] : [0.28, 0.4, 0.32] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Soft clouds */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute rounded-[999px] blur-3xl"
          style={{
            width: `${28 + (i % 3) * 12}vmin`,
            height: `${9 + (i % 2) * 4}vmin`,
            top: `${8 + i * 16}%`,
            left: `${-18 + i * 11}%`,
            background: isDay ? "rgba(255,255,255,0.65)" : "rgba(200, 210, 255, 0.12)",
          }}
          animate={{ x: ["-4%", "6%", "-2%"], opacity: isDay ? [0.5, 0.75, 0.55] : [0.2, 0.35, 0.22] }}
          transition={{ duration: 22 + i * 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
        />
      ))}

      {/* Stars */}
      {stars.map((s, i) => (
        <motion.span
          key={`st-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            background: isDay ? "rgba(255,255,255,0.95)" : "rgba(255, 250, 255, 0.9)",
            boxShadow: isDay
              ? "0 0 10px rgba(255,200,230,0.5)"
              : "0 0 12px rgba(200, 210, 255, 0.55), 0 0 22px rgba(160, 180, 255, 0.25)",
          }}
          animate={{ opacity: [s.o * 0.35, s.o, s.o * 0.4], scale: [1, 1.15, 1] }}
          transition={{ duration: s.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Sparkle crosses */}
      {sparkles.map((sp, i) => (
        <motion.span
          key={`sp-${i}`}
          className="absolute text-violet-200/90"
          style={{
            left: `${sp.x}%`,
            top: `${sp.y}%`,
            fontSize: sp.s,
            rotate: sp.rot,
            textShadow: "0 0 8px rgba(255,255,255,0.6)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.2, 0.9, 0], scale: [0.6, 1.1, 0.9, 1] }}
          transition={{
            duration: 5 + (i % 4),
            repeat: Infinity,
            delay: sp.delay,
            ease: "easeInOut",
          }}
        >
          ✦
        </motion.span>
      ))}

      {/* Rising glow orbs */}
      {particles.map((p, i) => (
        <motion.span
          key={`pt-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: "-4%",
            width: p.size,
            height: p.size,
            background: isDay
              ? "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(220, 200, 255, 0.4) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(230, 240, 255,0.55) 0%, rgba(160, 180, 255, 0.25) 50%, transparent 72%)",
            boxShadow: "0 0 14px rgba(200, 210, 255, 0.35)",
          }}
          animate={{ y: [0, -120 - (i % 5) * 35], x: [(i % 3) * 6 - 6, 0], opacity: [0, 0.55, 0.35, 0] }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Gentle film shimmer */}
      <motion.div
        className="absolute inset-0 mix-blend-soft-light opacity-[0.12]"
        style={{
          background:
            "linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.5) 48%, transparent 62%)",
        }}
        animate={{ translateX: ["-30%", "40%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
