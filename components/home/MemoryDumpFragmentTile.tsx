"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useState, type Dispatch, type MouseEvent, type SetStateAction } from "react";
import { MemoryDumpAuthorBadge } from "@/components/home/MemoryDumpAuthorBadge";
import { MemoryFragmentMedia } from "@/components/home/MemoryFragmentMedia";
import { resolveMemoryDumpAuthor } from "@/lib/memory-dump-storage";
import type { GalleryItem } from "@/lib/memory-dump-storage";

type Scatter = {
  left: number;
  top: number;
  rotate: number;
  width: number;
  z: number;
};

export function MemoryDumpFragmentTile({
  item,
  index,
  s,
  hoverId,
  setHoverId,
  setSelectedId,
  onRemove,
}: {
  item: GalleryItem;
  index: number;
  s: Scatter;
  hoverId: string | null;
  setHoverId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const isHover = hoverId === item.id;
  const stagger = Math.min(index, 28) * 0.055;

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / Math.max(r.width, 1) - 0.5) * 2;
    const ny = ((e.clientY - r.top) / Math.max(r.height, 1) - 0.5) * 2;
    setTilt({ rx: ny * -5, ry: nx * 6 });
  }, []);

  const onLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
    setHoverId((id) => (id === item.id ? null : id));
  }, [item.id, setHoverId]);

  const springIn = { type: "spring" as const, stiffness: 280, damping: 32 };
  const springTilt = { type: "spring" as const, stiffness: 300, damping: 34 };

  return (
    <div
      className="absolute"
      style={{
        left: `${s.left}%`,
        top: `${s.top}%`,
        zIndex: s.z,
        transform: "translate(-50%, -50%)",
        perspective: 980,
      }}
    >
      <motion.div
        role="button"
        tabIndex={0}
        layoutId={`memory-dump-${item.id}`}
        className="relative block cursor-pointer overflow-hidden rounded-lg border border-white/[0.14] bg-white/[0.06] shadow-[0_14px_44px_rgba(0,0,0,0.4)] outline-none ring-0 backdrop-blur-[2px] transition-[box-shadow,border-color] duration-500 hover:border-white/22 hover:shadow-[0_18px_48px_rgba(40,35,70,0.42)] focus-visible:ring-2 focus-visible:ring-white/35"
        style={{
          width: s.width,
          maxWidth: "min(42vw, 280px)",
          transformStyle: "preserve-3d",
        }}
        initial={{
          opacity: 0,
          scale: 0.94,
          y: 18,
          rotateX: 0,
          rotateY: 0,
          rotateZ: s.rotate,
        }}
        animate={{
          opacity: 1,
          scale: isHover ? 1.028 : 1,
          y: 0,
          rotateX: tilt.rx,
          rotateY: tilt.ry,
          rotateZ: s.rotate,
        }}
        transition={{
          opacity: { delay: stagger, ...springIn },
          y: { delay: stagger, ...springIn },
          scale: springTilt,
          rotateX: springTilt,
          rotateY: springTilt,
          rotateZ: { type: "spring", stiffness: 220, damping: 34 },
        }}
        onClick={() => setSelectedId(item.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedId(item.id);
          }
        }}
        onMouseEnter={() => setHoverId(item.id)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <button
          type="button"
          className="pointer-events-auto absolute right-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-rose-950/50 hover:text-white"
          aria-label="删除照片"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
        <div className="relative aspect-[4/3] w-full bg-[#0c0e16]/80">
          <MemoryFragmentMedia
            item={{
              src: item.src,
              caption: item.caption,
              mediaType: item.mediaType ?? "image",
            }}
            variant="card"
            cardHovered={isHover}
            sizes="280px"
          />
          <MemoryDumpAuthorBadge author={resolveMemoryDumpAuthor(item)} itemId={item.id} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 pr-10">
            <p className="line-clamp-2 text-left text-[10px] leading-snug text-white/85">{item.caption}</p>
          </div>
        </div>

        <AnimatePresence>
          {isHover && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute left-1/2 top-0 z-10 w-[min(100%,240px)] -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-black/82 px-3 py-2 text-left font-mono text-[10px] leading-relaxed text-white/88 shadow-xl backdrop-blur-md"
            >
              <p>
                <span className="text-white/45">Timestamp:</span> {item.meta.timestamp}
              </p>
              <p className="mt-0.5">
                <span className="text-white/45">Mood:</span> {item.meta.mood}
              </p>
              <p className="mt-0.5">
                <span className="text-white/45">Location:</span> {item.meta.location}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
