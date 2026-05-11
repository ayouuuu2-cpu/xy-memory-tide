"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { GalleryItem } from "@/lib/memory-dump-storage";

type Props = {
  item: Pick<GalleryItem, "src" | "caption" | "mediaType">;
  variant: "card" | "detail";
  /** Card: subtle motion — play while hovered (muted loop). */
  cardHovered?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Renders a memory fragment as either an image (`next/image`) or inline `<video>`.
 * Videos: card = play-on-hover, muted, loop; detail = native controls.
 */
export function MemoryFragmentMedia({
  item,
  variant,
  cardHovered = false,
  className = "",
  sizes = "280px",
  priority = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isVideo = item.mediaType === "video";

  const syncCardVideo = useCallback(() => {
    const el = videoRef.current;
    if (!el || variant !== "card") return;
    if (cardHovered) {
      void el.play().catch(() => {});
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [cardHovered, variant]);

  useEffect(() => {
    syncCardVideo();
  }, [syncCardVideo]);

  if (isVideo) {
    if (variant === "detail") {
      return (
        <video
          src={item.src}
          className={className || "absolute inset-0 h-full w-full object-contain"}
          controls
          playsInline
          preload="metadata"
        >
          {item.caption}
        </video>
      );
    }
    return (
      <video
        ref={videoRef}
        src={item.src}
        className={className || "absolute inset-0 h-full w-full object-cover"}
        muted
        playsInline
        loop
        preload="metadata"
        aria-label={item.caption}
      />
    );
  }

  if (variant === "detail") {
    return (
      <Image
        src={item.src}
        alt={item.caption}
        fill
        className={className || "object-contain"}
        sizes={sizes}
        unoptimized
        priority={priority}
        draggable={false}
      />
    );
  }

  return (
    <Image
      src={item.src}
      alt={item.caption}
      fill
      className={className || "object-cover"}
      sizes={sizes}
      unoptimized
      draggable={false}
    />
  );
}
