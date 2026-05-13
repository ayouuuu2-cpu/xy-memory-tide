"use client";

import { useId, type SVGProps } from "react";

/**
 * 迷你信封 — 封口折线 + 火漆圆印，列表里呈现「封存」感。
 */
export function MiniEnvelopeGlyph({ className, ...rest }: SVGProps<SVGSVGElement>) {
  const raw = useId();
  const uid = (raw.replace(/[^a-zA-Z0-9_-]/g, "") || "e").slice(0, 24);
  const gid = `env-paper-${uid}`;
  const wax = `env-wax-${uid}`;

  return (
    <svg
      viewBox="0 0 64 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="52" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4e8d4" />
          <stop offset="1" stopColor="#dcc7a8" />
        </linearGradient>
        <radialGradient id={wax} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#c94b5a" />
          <stop offset="55%" stopColor="#8f2434" />
          <stop offset="100%" stopColor="#5c141c" />
        </radialGradient>
      </defs>
      {/* 封套 */}
      <path
        d="M4 14C4 8.47715 8.47715 4 14 4H50C55.5228 4 60 8.47715 60 14V40C60 45.5228 55.5228 50 50 50H14C8.47715 50 4 45.5228 4 40V14Z"
        fill={`url(#${gid})`}
        stroke="rgba(110,82,48,0.55)"
        strokeWidth="1.15"
      />
      {/* 内衬折影 */}
      <path d="M4 14L32 34L60 14" stroke="rgba(90,70,45,0.35)" strokeWidth="1" strokeLinejoin="round" />
      {/* 封口盖片（合上） */}
      <path
        d="M4 14L32 36L60 14V14C60 10 56 6 50 6H14C8 6 4 10 4 14Z"
        fill="rgba(255,248,235,0.42)"
        stroke="rgba(120,92,58,0.38)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* 火漆 */}
      <ellipse cx="32" cy="22" rx="9" ry="10.5" fill={`url(#${wax})`} stroke="rgba(40,10,14,0.35)" strokeWidth="0.6" />
      <ellipse cx="29" cy="19" rx="2.2" ry="1.4" fill="rgba(255,220,210,0.35)" transform="rotate(-28 29 19)" />
      <path
        d="M32 17.5v7M28.5 21h7"
        stroke="rgba(60,12,18,0.28)"
        strokeWidth="0.85"
        strokeLinecap="round"
      />
    </svg>
  );
}
