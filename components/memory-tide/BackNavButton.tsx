"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Top-left: return to site home (`/`) — same landing as Trace / Wish entry. */
export function BackNavButton() {
  return (
    <motion.div
      className="fixed left-5 top-5 z-[120]"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        href="/"
        aria-label="Back to home"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/[0.06] text-violet-100/90 shadow-[0_6px_24px_rgba(20,12,48,0.35)] backdrop-blur-md transition hover:border-white/28 hover:bg-white/[0.1]"
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </Link>
    </motion.div>
  );
}
