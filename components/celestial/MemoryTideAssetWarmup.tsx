"use client";

import { useEffect } from "react";

const CRITICAL_IMAGES = [
  "/images/background-new.jpg",
  "/images/rory/rory-seal.png",
  "/images/rory/rory-typing.png",
  "/images/rory/rory-celebrate.png",
  "/images/rory/rory-avatar-frame.png",
  "/images/decoration/washi-tape-purple.svg",
  "/images/decoration/kraft-paper-texture.svg",
];

export function MemoryTideAssetWarmup() {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const imgs: HTMLImageElement[] = [];

    for (const src of CRITICAL_IMAGES) {
      const existing = document.querySelector(`link[rel="preload"][as="image"][href="${src}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = src;
        if (src.includes("background-new")) link.fetchPriority = "high";
        document.head.appendChild(link);
        links.push(link);
      }

      const img = new Image();
      img.decoding = "async";
      img.src = src;
      void img.decode().catch(() => {
        /* noop */
      });
      imgs.push(img);
    }

    return () => {
      for (const link of links) link.remove();
      void imgs;
    };
  }, []);

  return null;
}
