"use client";

import { motion } from "framer-motion";

/** Soft twin star companions — original rounded shapes (not branded characters). */
function BlobStar({
  fill,
  blush,
  star,
  delay,
  gradId,
}: {
  fill: string;
  blush: string;
  star: string;
  delay: number;
  gradId: string;
}) {
  return (
    <motion.svg
      viewBox="0 0 120 140"
      className="h-[clamp(4.5rem,14vmin,7rem)] w-[clamp(4rem,12vmin,6rem)] drop-shadow-[0_8px_24px_rgba(120,100,200,0.35)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 1.2, delay: delay * 0.4 },
        y: { duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay },
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={blush} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="88" rx="48" ry="44" fill={`url(#${gradId})`} />
      <ellipse cx="42" cy="78" rx="5" ry="6" fill="#4a3f6b" opacity="0.55" />
      <ellipse cx="78" cy="78" rx="5" ry="6" fill="#4a3f6b" opacity="0.55" />
      <ellipse cx="38" cy="92" rx="10" ry="6" fill="#ffb8d0" opacity="0.35" />
      <ellipse cx="82" cy="92" rx="10" ry="6" fill="#ffb8d0" opacity="0.35" />
      <path
        d="M60 8l6 14h14l-11 9 4 15-13-9-13 9 4-15-11-9h14z"
        fill={star}
        opacity="0.95"
        transform="translate(0,4)"
      />
      <ellipse cx="60" cy="28" rx="14" ry="8" fill="white" opacity="0.25" />
    </motion.svg>
  );
}

type Props = {
  /** When false, hide (e.g. during loading). */
  visible?: boolean;
};

export function DreamFriends({ visible = true }: Props) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[11] flex items-end justify-between px-[clamp(0.5rem,3vw,1.5rem)] pb-[clamp(5rem,18vh,10rem)]"
      aria-hidden
    >
      <BlobStar fill="#e8ddff" blush="#d4c4ff" star="#ffe8aa" delay={0} gradId="dream-blob-a" />
      <div className="translate-x-2 translate-y-4 scale-x-[-1]">
        <BlobStar fill="#d8ecff" blush="#c4dcff" star="#ffd4e8" delay={1.2} gradId="dream-blob-b" />
      </div>
    </div>
  );
}
