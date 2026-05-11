"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Memory } from "@/lib/memories";

type Props = {
  memory: Memory;
};

export function MemoryDetail({ memory }: Props) {
  return (
    <motion.article
      className="relative z-10 mx-auto w-full max-w-xl px-5 pb-28 pt-16 sm:px-6 sm:pt-20"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-white/50 px-4 py-2 text-[13px] font-bold tracking-wide text-violet-700 shadow-[0_6px_24px_rgba(160,140,220,0.25)] backdrop-blur-sm transition hover:scale-[1.03] hover:border-violet-400/60 hover:bg-white/70"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        <span>Drift home</span>
      </Link>

      <div className="mt-10 rounded-[2rem] border border-white/50 bg-white/55 p-8 shadow-[0_20px_60px_rgba(130,110,190,0.2),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md sm:p-10">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-500/90">
          {memory.location}
        </p>
        <h1 className="font-display mt-4 text-balance text-[2rem] font-medium leading-tight tracking-tight text-violet-950 sm:text-[2.35rem]">
          {memory.title}
        </h1>
        <p className="mt-3 text-[15px] font-semibold leading-snug text-violet-800/85">{memory.titleEn}</p>
        <p className="mt-6 inline-block rounded-full bg-violet-100/80 px-3 py-1 text-[12px] font-bold tracking-wide text-violet-700">
          {memory.date}
        </p>

        <div className="mt-8 h-2 w-full rounded-full bg-gradient-to-r from-pink-200/50 via-violet-200/70 to-sky-200/50" />

        <p className="mt-8 text-[16px] font-medium leading-[1.85] text-violet-950/88">{memory.excerpt}</p>

        <div className="mt-10 space-y-8">
          {memory.body.map((p, i) => (
            <motion.p
              key={i}
              className="rounded-2xl border border-violet-100/80 bg-gradient-to-br from-white/80 to-violet-50/50 px-5 py-4 text-[15px] font-medium leading-[1.95] text-violet-900/90 shadow-sm"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.9, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              {p}
            </motion.p>
          ))}
        </div>
      </div>

      <p className="pointer-events-none mt-8 text-center text-[12px] font-semibold tracking-wide text-violet-600/55">
        ✦ saved in the tide ✦
      </p>
    </motion.article>
  );
}
