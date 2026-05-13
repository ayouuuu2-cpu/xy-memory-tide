"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { MemoryObject } from "@/lib/memory-objects";
import { ImmersiveMemoryViewer } from "./ImmersiveMemoryViewer";

type Props = {
  items: MemoryObject[];
  immersive?: boolean;
  onCloseOverlay?: () => void;
  /** 选中地点名称（与地球上英文标签可并存） */
  placeTitle?: string;
};

function scatter(id: string, index: number) {
  let h = 0;
  const key = `${id}-${index}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return {
    left: 8 + (h % 78),
    top: 10 + ((h >>> 4) % 70),
    tilt: ((h % 21) - 10) * 0.8,
    z: 1 + (h % 12),
  };
}

export function MemorySceneStage({ items, immersive = false, onCloseOverlay, placeTitle }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState<MemoryObject | null>(null);
  const [expanded, setExpanded] = useState(false);
  const nodes = useMemo(() => items.map((it, i) => ({ it, p: scatter(it.id, i) })), [items]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        immersive
          ? `${
              expanded ? "fixed inset-6 z-[180]" : "rounded-2xl"
            } bg-[radial-gradient(ellipse_at_50%_50%,rgba(38,26,72,0.36),rgba(5,4,12,0.62)_65%,rgba(3,2,8,0.75))]`
          : "min-h-[68vh] rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_40%_20%,rgba(89,76,140,0.22),rgba(10,8,18,0.95))]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(120,170,255,0.14),transparent_40%)]" />
      {immersive && placeTitle ? (
        <div className="pointer-events-none absolute left-4 top-4 z-30 max-w-[min(280px,70vw)]">
          <p className="font-display text-lg text-violet-50 drop-shadow-md sm:text-xl">{placeTitle}</p>
          <p className="mt-0.5 text-[11px] tracking-[0.14em] text-violet-200/65">
            Memories · {items.length}
          </p>
        </div>
      ) : null}
      {immersive && onCloseOverlay ? (
        <div className="absolute right-3 top-3 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white/85"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <button
            type="button"
            onClick={onCloseOverlay}
            className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white/85"
          >
            Close
          </button>
        </div>
      ) : null}
      {nodes.map(({ it, p }, index) => {
        const dimmed = hovered !== null && hovered !== it.id;
        const common = {
          initial: { opacity: 0, y: 30, scale: 0.9, rotate: p.tilt - 3 },
          animate: {
            opacity: dimmed ? 0.28 : 1,
            y: 0,
            scale: hovered === it.id ? 1.08 : 1,
            rotate: p.tilt,
          },
          transition: { duration: 0.75, delay: index * 0.08 },
          style: { left: `${p.left}%`, top: `${p.top}%`, zIndex: p.z },
          onHoverStart: () => setHovered(it.id),
          onHoverEnd: () => setHovered(null),
          onClick: () => setOpen(it),
        };

        if (it.type === "photo") {
          return (
            <motion.button
              key={it.id}
              type="button"
              className="absolute w-[min(19vw,180px)] overflow-hidden rounded-md border border-white/20 bg-white p-2 shadow-2xl"
              {...common}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- memory object URLs */}
              <img src={it.url} alt={it.caption ?? ""} className="h-[130px] w-full object-cover" />
              <p className="mt-2 truncate text-left text-xs text-neutral-800">{it.caption || "Photo fragment"}</p>
            </motion.button>
          );
        }
        if (it.type === "video") {
          return (
            <motion.button
              key={it.id}
              type="button"
              className="absolute w-[min(23vw,220px)] overflow-hidden rounded-lg border border-white/20 bg-black/65 p-2 shadow-2xl"
              {...common}
            >
              <video src={it.url} poster={it.posterUrl} className="h-[126px] w-full object-cover opacity-85" muted />
              <p className="mt-2 truncate text-left text-xs text-amber-100/90">{it.caption || "Film fragment"}</p>
            </motion.button>
          );
        }
        if (it.type === "music") {
          return (
            <motion.button
              key={it.id}
              type="button"
              className="absolute flex h-24 w-24 items-center justify-center rounded-full border border-fuchsia-200/45 bg-fuchsia-400/20 text-xs text-fuchsia-100 shadow-[0_0_40px_rgba(210,120,255,0.45)]"
              {...common}
            >
              ♪
            </motion.button>
          );
        }
        if (it.type === "link") {
          return (
            <motion.button
              key={it.id}
              type="button"
              className="absolute w-[min(18vw,170px)] rounded-full border border-cyan-200/40 bg-cyan-200/10 px-4 py-3 text-left text-xs text-cyan-50 shadow-xl"
              {...common}
            >
              {it.title || "Message bottle"}
            </motion.button>
          );
        }
        return (
          <motion.button
            key={it.id}
            type="button"
            className="absolute w-[min(21vw,210px)] rounded-md border border-[#d7c09f]/45 bg-[#f8e9c7]/95 p-3 text-left text-xs text-[#3a2c1f] shadow-xl"
            {...common}
          >
            {it.content}
          </motion.button>
        );
      })}

      <ImmersiveMemoryViewer memory={open} onClose={() => setOpen(null)} />
    </div>
  );
}
