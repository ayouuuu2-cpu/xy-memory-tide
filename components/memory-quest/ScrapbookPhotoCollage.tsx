"use client";

import { useMemo } from "react";

export type ScrapbookMediaItem = {
  id: string;
  url: string;
  caption: string;
  mediaType: "image" | "video";
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Stable pseudo-random in [0, 1) from id */
function unit(id: string, salt: number): number {
  return (hashSeed(`${id}:${salt}`) % 10000) / 10000;
}

/**
 * Scrapbook / polaroid stack — rotations, tape, overlap; violet palette aligned with Memory Tide.
 */
export function ScrapbookPhotoCollage({
  items,
  onOpenScatter,
  onRemoveItem,
}: {
  items: ScrapbookMediaItem[];
  /** Image-only: opens full-screen scattered desk view. */
  onOpenScatter?: (item: ScrapbookMediaItem) => void;
  /** 小 × 快速移除（云端会删 photos 行；本地仅从列表移除后由父级同步 gallery）。 */
  onRemoveItem?: (item: ScrapbookMediaItem) => void;
}) {
  const layout = useMemo(() => {
    return items.map((item, index) => {
      const u1 = unit(item.id, 1);
      const u2 = unit(item.id, 2);
      const u3 = unit(item.id, 3);
      const u4 = unit(item.id, 4);
      const rotate = -5 + u1 * 10;
      const leftPct = 6 + u2 * 54 + (index % 3) * 4;
      const topPx = index * 52 + u3 * 36 - 12;
      const z = 10 + index + Math.floor(u4 * 6);
      const tapeLeftPct = 18 + u4 * 48;
      const tapeRotate = -14 + unit(item.id, 5) * 28;
      const tapeHue = unit(item.id, 6) > 0.5 ? "rgba(216, 198, 255, 0.52)" : "rgba(196, 210, 255, 0.48)";
      return { rotate, leftPct, topPx, z, tapeLeftPct, tapeRotate, tapeHue };
    });
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="relative mx-auto min-h-[120px] w-full max-w-[380px] py-2">
      {items.map((item, index) => {
        const L = layout[index]!;
        const polaroidFrame = (
          <>
            <div className="relative overflow-hidden rounded-[2px] bg-black/20 ring-1 ring-violet-300/15">
              {item.mediaType === "video" ? (
                <video src={item.url} className="aspect-video max-h-44 w-full object-cover" controls playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic gallery URLs (not known at build)
                <img src={item.url} alt={item.caption || ""} className="max-h-48 w-full object-cover" loading="lazy" />
              )}
            </div>
            {item.caption ? (
              <p className="mt-2 line-clamp-2 px-1 text-center text-[11px] leading-snug tracking-wide text-violet-950/75">
                {item.caption}
              </p>
            ) : (
              <div className="mt-2 h-5" aria-hidden />
            )}
          </>
        );
        const polaroidShell =
          item.mediaType === "image" && onOpenScatter ? (
            <button
              type="button"
              data-scrap-photo-trigger={item.id}
              className="relative w-full rounded-[3px] bg-[#faf8ff] p-2 pb-9 text-left shadow-[4px_8px_22px_rgba(28,18,52,0.42),0_1px_0_rgba(255,255,255,0.55)_inset] cursor-pointer transition hover:brightness-[1.03]"
              style={{
                border: "1px solid rgba(180, 170, 220, 0.35)",
              }}
              onClick={() => onOpenScatter(item)}
            >
              {polaroidFrame}
            </button>
          ) : (
            <div
              className="relative rounded-[3px] bg-[#faf8ff] p-2 pb-9 shadow-[4px_8px_22px_rgba(28,18,52,0.42),0_1px_0_rgba(255,255,255,0.55)_inset]"
              style={{
                border: "1px solid rgba(180, 170, 220, 0.35)",
              }}
            >
              {polaroidFrame}
            </div>
          );

        return (
          <div
            key={item.id}
            className="absolute w-[min(82%,260px)] max-w-[260px]"
            style={{
              left: `${L.leftPct}%`,
              top: L.topPx,
              transform: `rotate(${L.rotate}deg)`,
              zIndex: L.z,
            }}
          >
            {onRemoveItem ? (
              <button
                type="button"
                aria-label="移除照片"
                className="pointer-events-auto absolute -right-1 -top-1 z-[5] flex h-7 w-7 items-center justify-center rounded-full border border-rose-400/40 bg-black/55 text-rose-100/90 shadow-md backdrop-blur-sm transition hover:bg-rose-950/70"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRemoveItem(item);
                }}
              >
                <span className="text-[13px] font-semibold leading-none">×</span>
              </button>
            ) : null}
            <div
              className="pointer-events-none absolute z-[2] h-[11px] w-[min(42%,5.5rem)] rounded-[2px] shadow-[0_1px_3px_rgba(40,30,80,0.35)]"
              style={{
                left: `${L.tapeLeftPct}%`,
                top: "-6px",
                transform: `translateX(-50%) rotate(${L.tapeRotate}deg)`,
                background: `linear-gradient(90deg, transparent 0%, ${L.tapeHue} 12%, ${L.tapeHue} 88%, transparent 100%)`,
                border: "1px solid rgba(255,255,255,0.22)",
              }}
              aria-hidden
            />
            {polaroidShell}
          </div>
        );
      })}
      <div
        className="pointer-events-none opacity-0"
        style={{ height: Math.max(140, items.length * 72 + 40) }}
        aria-hidden
      />
    </div>
  );
}
