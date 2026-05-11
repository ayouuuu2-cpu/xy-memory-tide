"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/** Pale lavender, soft mint, champagne gold — rich macaron mix */
const PALETTES = [
  {
    bg: "rgba(218, 198, 255, 0.95)",
    halo: "0 0 4px rgba(200, 175, 255, 0.9), 0 0 12px rgba(180, 150, 255, 0.45), 0 0 22px rgba(160, 130, 240, 0.22)",
  },
  {
    bg: "rgba(178, 238, 218, 0.92)",
    halo: "0 0 4px rgba(160, 230, 210, 0.85), 0 0 14px rgba(130, 220, 195, 0.4), 0 0 24px rgba(100, 200, 175, 0.18)",
  },
  {
    bg: "rgba(255, 246, 214, 0.93)",
    halo: "0 0 5px rgba(255, 238, 200, 0.95), 0 0 14px rgba(255, 225, 180, 0.42), 0 0 26px rgba(240, 200, 150, 0.2)",
  },
] as const;

type DepthLayer = "back" | "mid" | "front";

type ParticleSpec = {
  left: number;
  top: number;
  sizePx: number;
  x0: number;
  x1: number;
  fallDur: number;
  twDur: number;
  delay: number;
  oMin: number;
  oMax: number;
  layer: DepthLayer;
  palette: (typeof PALETTES)[number];
};

function hash(i: number, salt: number) {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function randomLayer(i: number): DepthLayer {
  const r = hash(i, 99);
  if (r < 0.34) return "back";
  if (r < 0.67) return "mid";
  return "front";
}

/** Pure builder — only run in the browser after mount to avoid SSR/client random drift. */
function buildParticleSpecs(count: number): ParticleSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const h0 = hash(i, 1);
    const h1 = hash(i, 2);
    const h2 = hash(i, 3);
    const h3 = hash(i, 4);
    const h4 = hash(i, 5);
    const h5 = hash(i, 6);
    const h6 = hash(i, 7);
    const h7 = hash(i, 8);
    const h8 = hash(i, 9);

    const layer = randomLayer(i);
    const palette = PALETTES[i % PALETTES.length];

    let sizePx = 1 + h0 * 2.5;
    if (layer === "front") sizePx = Math.min(3.5, sizePx * 1.15 + 0.25);
    if (layer === "back") sizePx = Math.max(1, sizePx * 0.72);

    let oMin = 0.4 + h1 * 0.22;
    let oMax = 0.55 + h2 * 0.35;
    if (oMax < oMin + 0.08) oMax = oMin + 0.12;
    if (oMax > 0.9) oMax = 0.9;
    if (oMin > 0.82) oMin = 0.72;
    if (layer === "back") {
      oMin *= 0.78;
      oMax *= 0.82;
    } else if (layer === "front") {
      oMin = Math.min(0.88, oMin + 0.05);
      oMax = Math.min(0.9, oMax + 0.04);
    }

    const driftSpan = 8 + h5 * 34;
    const x0 = -driftSpan * 0.5 + h6 * driftSpan;
    const x1 = x0 + (-16 + h7 * 32);

    let fallDur: number;
    if (layer === "back") fallDur = 92 + h3 * 58;
    else if (layer === "mid") fallDur = 52 + h3 * 38;
    else fallDur = 34 + h3 * 22;

    const twDur = 4.2 + h8 * 5.5;
    const delay = -(h4 * fallDur * 0.95);

    return {
      left: h3 * 100,
      top: -8 + h4 * 96,
      sizePx,
      x0,
      x1,
      fallDur,
      twDur,
      delay,
      oMin,
      oMax,
      layer,
      palette,
    };
  });
}

/**
 * Stardust “celestial waterfall”: dense CSS particles + 3 depth layers + framer wrapper when Whisper plays.
 * Particle layout is generated only after mount (useEffect) so SSR and first client paint match — no hydration mismatch.
 */
export function StarDustField({
  baseCount = 210,
  isPlaying = false,
  audioLevel = 0,
}: {
  baseCount?: number;
  isPlaying?: boolean;
  audioLevel?: number;
}) {
  const level = Math.min(1, Math.max(0, audioLevel));
  const count = useMemo(() => Math.round(baseCount * 3 * (isPlaying ? 1.28 : 1)), [baseCount, isPlaying]);

  const [specs, setSpecs] = useState<ParticleSpec[] | null>(null);

  useEffect(() => {
    setSpecs(buildParticleSpecs(count));
  }, [count]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-transparent"
      animate={isPlaying ? { opacity: [0.92, 1, 0.94, 1, 0.96] } : { opacity: 1 }}
      transition={
        isPlaying
          ? { duration: Math.max(3.2, 5.8 - level * 1.8), repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.35 }
      }
    >
      {/* Stable: no particle nodes until after mount — matches SSR and first client paint. */}
      {specs !== null
        ? specs.map((p, i) => (
          <span
            key={`${p.layer}-${i}`}
            className={`memory-tide-stardust-particle memory-tide-stardust-particle--${p.layer}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.sizePx,
              height: p.sizePx,
              minWidth: p.sizePx,
              minHeight: p.sizePx,
              backgroundColor: p.palette.bg,
              boxShadow: p.palette.halo,
              ["--sd-x0" as string]: `${p.x0}px`,
              ["--sd-x1" as string]: `${p.x1}px`,
              ["--sd-o-min" as string]: String(p.oMin),
              ["--sd-o-max" as string]: String(p.oMax),
              animationDuration: `${p.fallDur}s, ${p.twDur}s`,
              animationDelay: `${p.delay}s, ${p.delay * 0.25}s`,
            }}
          />
        ))
        : null}
    </motion.div>
  );
}
