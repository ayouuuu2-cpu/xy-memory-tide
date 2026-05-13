"use client";

import { useMemo } from "react";

type Props = {
  /** 用于稳定生成色相与撕边种子（如 noteId + strand） */
  moodKey: string;
  className?: string;
  /** 信纸顶横幅 | 拍立得小条 */
  variant?: "banner" | "polaroid";
};

/**
 * 纯 CSS 半透明和纸胶带 + 撕纸感边缘，不依赖图片素材。
 * 色相由 moodKey 哈希，模拟 Rory「心意」变化。
 */
export function CssRoryWashiTape({ moodKey, className = "", variant = "banner" }: Props) {
  const { hue, edgeSeed } = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < moodKey.length; i++) {
      h ^= moodKey.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const hue = 248 + (Math.abs(h) % 32);
    const edgeSeed = Math.abs(h >>> 8) % 7;
    return { hue, edgeSeed };
  }, [moodKey]);

  const sizeClass = variant === "polaroid" ? "stationery-css-washi--polaroid" : "stationery-css-washi--banner";

  return (
    <div
      className={`stationery-css-washi ${sizeClass} ${className}`}
      style={
        {
          "--stationery-washi-h": String(hue),
          "--stationery-washi-edge": String(edgeSeed),
        } as React.CSSProperties
      }
      aria-hidden
    />
  );
}
