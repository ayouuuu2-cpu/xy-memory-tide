"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MemoryObject } from "@/lib/memory-objects";

type Props = {
  memory: MemoryObject | null;
  onClose: () => void;
};

export function ImmersiveMemoryViewer({ memory, onClose }: Props) {
  return (
    <AnimatePresence>
      {memory ? (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-4xl rounded-2xl border border-white/15 bg-black/45 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            {memory.type === "photo" && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- memory object URLs */}
                <img src={memory.url} alt={memory.caption ?? ""} className="max-h-[75vh] w-full rounded-xl object-contain" />
              </>
            )}
            {memory.type === "video" && (
              <video
                src={memory.url}
                poster={memory.posterUrl}
                controls
                className="max-h-[75vh] w-full rounded-xl object-contain"
              />
            )}
            {memory.type === "music" && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl bg-black/40 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-violet-200/70">Music Memory</p>
                <p className="text-xl text-violet-50">{memory.title || "Untitled track"}</p>
                <audio src={memory.url} controls className="w-full max-w-lg" />
              </div>
            )}
            {memory.type === "link" && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl bg-black/40 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/70">Message Bottle</p>
                <a
                  href={memory.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-lg text-cyan-100 underline decoration-dotted underline-offset-4"
                >
                  {memory.title || memory.url}
                </a>
                {memory.note ? <p className="max-w-xl text-sm text-cyan-100/70">{memory.note}</p> : null}
              </div>
            )}
            {memory.type === "text" && (
              <div className="flex min-h-[40vh] items-center justify-center rounded-xl bg-[#fff9e6]/95 p-8">
                <p className="max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-[#3b2a20]">{memory.content}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
