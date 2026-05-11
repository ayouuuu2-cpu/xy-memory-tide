"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Translucent jelly panel with soft cloud-like corners and glow border.
 */
export function JellyCloudCard({ children, className = "" }: Props) {
  return (
    <div
      className={`jelly-cloud-card relative border border-white/15 bg-gradient-to-b from-white/[0.09] to-white/[0.03] shadow-[0_12px_40px_rgba(30,20,60,0.45)] backdrop-blur-[12px] ${className}`}
      style={{
        borderRadius: "28px 36px 32px 40px / 36px 28px 40px 32px",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
