"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { ScrapbookMediaItem } from "@/components/memory-quest/ScrapbookPhotoCollage";

const WASHI = "/images/decoration/washi-tape-purple.svg";

type Props = {
  items: ScrapbookMediaItem[];
  initialFocusId: string | null;
  /** 每次点击侧栏照片递增，触发新一张“洒向中心” */
  layoutNonce: number;
  onClose: () => void;
};

type TossCard = {
  instanceId: string;
  item: ScrapbookMediaItem;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  rotate: number;
  tapeRot: number;
  tapeLeftPct: number;
  z: number;
  delay: number;
  shadow: string;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

/** 中心主体留白：地名标签 / 主 UI 不被挡住；四角允许更密。 */
function inCenterDeadZone(x: number, y: number, vw: number, vh: number): boolean {
  const cx = vw * 0.5;
  const cy = vh * 0.48;
  const rx = vw * 0.19;
  const ry = vh * 0.21;
  const nx = (x - cx) / Math.max(rx, 1);
  const ny = (y - cy) / Math.max(ry, 1);
  return nx * nx + ny * ny < 1;
}

function isEdgeBand(x: number, y: number, vw: number, vh: number): boolean {
  const xm = vw * 0.2;
  const ym = vh * 0.16;
  return x < xm || x > vw - xm || y < ym || y > vh - ym;
}

function buildScatterLayout(images: ScrapbookMediaItem[], vw: number, vh: number) {
  const centerX = vw * 0.52;
  const centerY = vh * 0.5;
  const range = Math.min(240, Math.max(160, Math.min(vw, vh) * 0.24));
  const placements: Array<{ x: number; y: number }> = [];
  const maxTry = 85;

  for (let i = 0; i < images.length; i++) {
    let placed = false;
    for (let t = 0; t < maxTry; t++) {
      const x = centerX + rand(-range, range);
      const y = centerY + rand(-range * 0.82, range * 0.82);
      if (inCenterDeadZone(x, y, vw, vh)) continue;
      const minNeed = isEdgeBand(x, y, vw, vh) ? rand(52, 74) : rand(96, 118);
      const ok = placements.every((p) => {
        const dx = x - p.x;
        const dy = y - p.y;
        return Math.hypot(dx, dy) >= minNeed;
      });
      if (ok) {
        placements.push({ x, y });
        placed = true;
        break;
      }
    }
    if (!placed) {
      const angle = (i / Math.max(1, images.length)) * Math.PI * 2 + rand(-0.35, 0.35);
      const r = Math.min(range * 1.02, 72 + i * 22);
      let x = centerX + Math.cos(angle) * r + rand(-18, 18);
      let y = centerY + Math.sin(angle) * r * 0.82 + rand(-16, 16);
      let guard = 0;
      while (inCenterDeadZone(x, y, vw, vh) && guard < 12) {
        x = centerX + Math.cos(angle + rand(-0.4, 0.4)) * (r + 40) + rand(-12, 12);
        y = centerY + Math.sin(angle) * (r + 36) * 0.82 + rand(-12, 12);
        guard += 1;
      }
      placements.push({ x, y });
    }
  }
  return placements;
}

/**
 * 透明顶层“撒片”：
 * - 无深色 backdrop / 无 modal 画布。
 * - 每次点侧栏照片，从侧栏飞到屏幕中心附近（±50px, -15~15deg）。
 * - 多张并存叠放，可单张点击缩放消失。
 */
export function ScatteredPhotoGalleryOverlay({ items, initialFocusId, layoutNonce, onClose }: Props) {
  const images = useMemo(() => items.filter((i) => i.mediaType === "image"), [items]);
  const [cards, setCards] = useState<TossCard[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const pickedId = initialFocusId ?? images[0]?.id ?? null;
    if (!pickedId || images.length === 0) return;

    const trigger = document.querySelector(`[data-scrap-photo-trigger="${pickedId}"]`) as HTMLElement | null;
    const tr = trigger?.getBoundingClientRect();
    const fromX = tr ? tr.left + tr.width * 0.5 : window.innerWidth * 0.82;
    const fromY = tr ? tr.top + tr.height * 0.4 : window.innerHeight * 0.62;

    const lead = images.find((i) => i.id === pickedId);
    const rest = images.filter((i) => i.id !== pickedId);
    const ordered = lead ? [lead, ...shuffle(rest)] : shuffle(images);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const layout = buildScatterLayout(ordered, vw, vh);

    const batch: TossCard[] = ordered.map((item, idx) => {
      const depth = Math.floor(rand(0, ordered.length + 2));
      const isTop = depth > Math.floor(ordered.length * 0.6);
      return {
        instanceId: `${item.id}-${layoutNonce}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        item,
        fromX,
        fromY,
        x: layout[idx]!.x,
        y: layout[idx]!.y,
        rotate: rand(-20, 20),
        tapeRot: rand(-16, 16),
        tapeLeftPct: rand(12, 58),
        z: 220 + depth,
        delay: idx * 0.04 + rand(0, 0.03),
        shadow: isTop
          ? "12px 18px 38px rgba(10,6,25,0.5), inset 0 1px 0 rgba(255,255,255,0.58)"
          : "8px 13px 28px rgba(14,8,30,0.38), inset 0 1px 0 rgba(255,255,255,0.55)",
      };
    });
    setCards(batch);
  }, [initialFocusId, images, layoutNonce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cards.length > 0) setCards([]);
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length, onClose]);

  const overlay = (
    <AnimatePresence>
      <div className="pointer-events-none fixed inset-0 z-[170] overflow-hidden" aria-hidden>
        <AnimatePresence>
          {cards.map((card, idx) => (
            <motion.button
              key={card.instanceId}
              type="button"
              layout
              className="pointer-events-auto absolute w-[min(42vw,230px)] rounded-[3px] bg-[#f4ecdc] p-2.5 pb-7 text-left shadow-[8px_14px_32px_rgba(14,8,30,0.38),inset_0_1px_0_rgba(255,255,255,0.55)]"
              style={{
                left: card.x,
                top: card.y,
                border: "1px solid rgba(120, 98, 72, 0.28)",
                zIndex: card.z + idx,
                boxShadow: card.shadow,
              }}
              initial={{
                x: card.fromX - card.x,
                y: card.fromY - card.y,
                rotate: 0,
                scale: 0.82,
                opacity: 0.55,
              }}
              animate={{ x: 0, y: 0, rotate: card.rotate, scale: 1, opacity: 1 }}
              exit={{ scale: 0.78, opacity: 0, rotate: card.rotate * 0.35 }}
              transition={{ duration: 0.44, delay: card.delay, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => {
                e.stopPropagation();
                setCards((prev) => prev.filter((x) => x.instanceId !== card.instanceId));
              }}
            >
              <div
                className="pointer-events-none absolute z-[2] w-[46%] max-w-[7.5rem] opacity-86"
                style={{
                  left: `${card.tapeLeftPct}%`,
                  top: "-0.42rem",
                  transform: `rotate(${card.tapeRot}deg)`,
                }}
              >
                <Image src={WASHI} alt="" width={120} height={32} className="h-auto w-full" unoptimized />
              </div>
              <div className="relative overflow-hidden rounded-[2px] bg-white ring-1 ring-black/12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.item.url} alt={card.item.caption || ""} className="aspect-[4/3] w-full object-cover" />
              </div>
              {card.item.caption ? (
                <p className="mt-1.5 line-clamp-2 px-1 text-left font-serif text-[11px] leading-relaxed text-[#3a2f28]/88">
                  {card.item.caption}
                </p>
              ) : null}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
