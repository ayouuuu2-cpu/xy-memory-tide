"use client";

import { useMemo } from "react";
import { memoryDumpAuthorOrbitHue, type GalleryAuthor } from "@/lib/memory-dump-storage";

type Props = {
  author: GalleryAuthor;
  itemId: string;
  /** `photo` = above caption strip (Memory Dump). `thumb` = corner on square gallery cells. */
  placement?: "photo" | "thumb";
  size?: "md" | "sm";
};

/** Tiny 8×8 pixel “space critter” when no avatar URL is set. */
function PixelCritterPlaceholder({ hue }: { hue: number }) {
  const fur = `hsl(${hue % 360}, 48%, 42%)`;
  const ear = `hsl(${(hue + 28) % 360}, 55%, 52%)`;
  const cheek = `hsl(${(hue + 320) % 360}, 70%, 72%)`;
  return (
    <svg viewBox="0 0 8 8" className="h-[72%] w-[72%]" aria-hidden>
      <rect x="2" y="0" width="1" height="2" fill={ear} />
      <rect x="5" y="0" width="1" height="2" fill={ear} />
      <rect x="1" y="2" width="6" height="5" rx="0.5" fill={fur} />
      <rect x="2" y="4" width="1" height="1" fill="#fefce8" />
      <rect x="5" y="4" width="1" height="1" fill="#fefce8" />
      <rect x="3" y="5" width="2" height="1" fill={cheek} />
    </svg>
  );
}

export function MemoryDumpAuthorBadge({ author, itemId, placement = "photo", size = "md" }: Props) {
  const name = author.name.trim() || "Stargazer";
  const url = author.avatar?.trim();
  const hue = useMemo(() => memoryDumpAuthorOrbitHue(`${itemId}\0${name}`), [itemId, name]);

  const posClass = placement === "thumb" ? "bottom-1 right-1" : "bottom-[2.35rem] right-1.5";
  const boxClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const tipClass = size === "sm" ? "text-[9px] px-2 py-1" : "text-[10px] px-2.5 py-1.5";

  return (
    <div
      className={`group/av pointer-events-auto absolute z-[14] flex flex-col items-center ${posClass}`}
      title={`Captured by ${name}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-[#07040f] shadow-[0_0_10px_rgba(255,255,255,0.3)] transition duration-300 group-hover/av:scale-[1.06] group-hover/av:shadow-[0_0_14px_rgba(255,255,255,0.42)] ${boxClass}`}
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary user / external avatar URLs
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          ) : (
            <PixelCritterPlaceholder hue={hue} />
          )}
        </div>
      </div>

      <div
        className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 min-w-max -translate-x-1/2 rounded-lg border border-white/18 bg-black/85 text-center font-medium leading-snug text-violet-100/95 opacity-0 shadow-[0_0_18px_rgba(180,160,255,0.25)] backdrop-blur-md transition duration-200 group-hover/av:opacity-100 ${tipClass}`}
        role="tooltip"
      >
        Captured by <span className="text-amber-100/95">{name}</span> ✨
      </div>
    </div>
  );
}
