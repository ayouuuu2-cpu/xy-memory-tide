"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

/** Small floating card — bottles, eggs, timeline detail. */
export function NarrativeWhisperCard({ open, onClose, title = "MEMORY", children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/25 px-6 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="max-w-sm rounded-2xl border border-white/15 bg-gradient-to-b from-[#1c1830]/95 to-[#12101c]/95 px-7 py-6 shadow-[0_0_40px_rgba(200,180,255,0.12)]"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-violet-300/55">{title}</p>
            <div className="mt-3 text-[15px] font-normal leading-relaxed tracking-wide text-violet-50/92">
              {children}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 text-xs font-medium text-violet-300/70 transition hover:text-violet-200"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
