"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import type { TimelineEntry } from "@/data/narrative-content";

type Props = {
  open: boolean;
  onClose: () => void;
  entries: TimelineEntry[];
};

/**
 * Horizontal drifting timeline — desktop, soft spacing, scroll + click for detail.
 */
export function NarrativeTimeline({ open, onClose, entries }: Props) {
  const [selected, setSelected] = useState<TimelineEntry | null>(null);

  const closeAll = useCallback(() => {
    setSelected(null);
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[45] flex flex-col justify-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          onClick={closeAll}
        >
          <motion.div
            className="relative max-h-[48vh] rounded-t-[2rem] border border-white/10 bg-gradient-to-b from-[#1a1628]/95 to-[#0e0c18]/98 px-8 pb-10 pt-8 shadow-[0_-20px_60px_rgba(0,0,0,0.45)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.4em] text-violet-300/50">
                  TIMELINE
                </p>
                <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-violet-50/95">
                  记忆在时间里慢慢漂
                </h2>
                <p className="mt-1 text-xs font-normal text-violet-200/45">
                  Memories drifting through time
                </p>
              </div>
              <button
                type="button"
                onClick={closeAll}
                className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-violet-200/80 transition hover:bg-white/5"
              >
                Close
              </button>
            </div>

            {/* Wavy guide line */}
            <div className="relative mb-4 h-14 w-full overflow-visible">
              <svg
                className="pointer-events-none absolute left-0 right-0 top-1/2 h-16 w-[120%] -translate-y-1/2 text-violet-400/25"
                preserveAspectRatio="none"
                viewBox="0 0 1200 80"
              >
                <path
                  d="M0 50 Q150 20 300 45 T600 40 T900 52 T1200 38"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="-mx-2 flex gap-10 overflow-x-auto overflow-y-visible px-2 pb-4 pt-2 [scrollbar-width:thin]">
              {entries.map((e, i) => (
                <motion.article
                  key={e.id}
                  className="group relative w-[min(14rem,72vw)] shrink-0 cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px -40px 0px 0px" }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setSelected(e)}
                  whileHover={{ y: -4 }}
                >
                  <div
                    className={`rounded-2xl border px-5 py-4 transition ${
                      selected?.id === e.id
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.04] hover:border-white/18"
                    }`}
                  >
                    <p className="text-[11px] font-medium tracking-wide text-violet-300/70">{e.era}</p>
                    <p className="mt-2 text-sm font-medium leading-snug text-violet-50/90">{e.title}</p>
                  </div>
                </motion.article>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.id}
                  className="mt-6 rounded-2xl border border-white/10 bg-black/25 px-6 py-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imageUrl}
                      alt=""
                      className="mb-4 max-h-40 w-full rounded-xl object-cover opacity-90"
                    />
                  ) : null}
                  <p className="text-[15px] font-normal leading-relaxed text-violet-100/88">{selected.body}</p>
                  <p className="mt-4 border-t border-white/10 pt-4 text-sm font-normal italic leading-relaxed text-violet-200/65">
                    {selected.emotion}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
