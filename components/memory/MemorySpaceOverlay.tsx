"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { LandmarkMemory } from "@/data/memories";
import { landmarkEmoji } from "@/lib/cute-marker";

type Props = {
  open: boolean;
  landmark: LandmarkMemory | null;
  onClose: () => void;
  onUpdateTexts: (texts: string[]) => void;
  onAddPhotos: (files: FileList | null) => void;
  onCaptionChange: (imageId: string, caption: string) => void;
  onRemoveImage: (imageId: string) => void;
};

function stickerTilt(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ((h % 13) - 6) * 0.6;
}

/** Irregular scrapbook positions (not a strict grid). */
function stickerSlot(seed: string, index: number) {
  let h = 0;
  const key = `${seed}-${index}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const left = 6 + (h % 58);
  const top = 6 + ((h >>> 7) % 52);
  return { left, top };
}

function TypeReveal({ text, active }: { text: string; active: boolean }) {
  const [shown, setShown] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((tid) => window.clearTimeout(tid));
    timers.current = [];
    if (!active) {
      queueMicrotask(() => setShown(""));
      return;
    }
    queueMicrotask(() => setShown(""));
    let i = 0;
    const schedule = () => {
      const tid = window.setTimeout(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i < text.length) schedule();
      }, 18 + (text.charCodeAt(Math.min(i, text.length - 1)) % 5));
      timers.current.push(tid);
    };
    const start = window.setTimeout(schedule, 200);
    timers.current.push(start);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [text, active]);

  return <>{shown}</>;
}

function PhotoSticker({
  img,
  index,
  stickersRef,
  onCaptionChange,
  onRemoveImage,
}: {
  img: LandmarkMemory["images"][0];
  index: number;
  stickersRef: RefObject<HTMLDivElement | null>;
  onCaptionChange: (imageId: string, caption: string) => void;
  onRemoveImage: (imageId: string) => void;
}) {
  const tilt = useMemo(() => stickerTilt(img.id), [img.id]);
  const slot = useMemo(() => stickerSlot(img.id, index), [img.id, index]);

  return (
    <motion.div
      drag
      dragConstraints={stickersRef}
      dragElastic={0.12}
      initial={{ scale: 0, rotate: tilt - 6, opacity: 0 }}
      animate={{ scale: 1, rotate: tilt, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: index * 0.06 }}
      style={{
        position: "absolute",
        left: `${slot.left}%`,
        top: `${slot.top}%`,
      }}
      className="w-[5.5rem] cursor-grab active:cursor-grabbing"
    >
      <div className="rounded-2xl border-[3px] border-white bg-white p-1 shadow-[0_6px_0_#e8b8d8,0_12px_20px_rgba(255,140,200,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
      </div>
      <input
        type="text"
        value={img.caption}
        placeholder="Tiny label…"
        onChange={(e) => onCaptionChange(img.id, e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-[#f5cce8] bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#6a4a62] placeholder:text-[#c8a8bc]"
      />
      <button
        type="button"
        onClick={() => onRemoveImage(img.id)}
        className="mt-1 w-full text-[10px] font-bold text-[#e070a8] hover:underline"
      >
        Peel off
      </button>
    </motion.div>
  );
}

export function MemorySpaceOverlay({
  open,
  landmark,
  onClose,
  onUpdateTexts,
  onAddPhotos,
  onCaptionChange,
  onRemoveImage,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const stickersRef = useRef<HTMLDivElement>(null);
  const texts = useMemo(() => landmark?.texts ?? [], [landmark]);
  const emoji = landmark ? landmarkEmoji(landmark.name, landmark.id) : "💌";

  const setParagraph = useCallback(
    (idx: number, value: string) => {
      const next = [...texts];
      next[idx] = value;
      onUpdateTexts(next);
    },
    [texts, onUpdateTexts],
  );

  const addParagraph = useCallback(() => {
    onUpdateTexts([...texts, ""]);
  }, [texts, onUpdateTexts]);

  return (
    <AnimatePresence>
      {open && landmark && (
        <motion.div
          className="fixed inset-0 z-[50] flex items-center justify-center px-3 py-6 sm:px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[#6b4080]/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="pointer-events-auto relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-b from-[#fff9ff] via-[#fff2fb] to-[#ffe8f4] shadow-[0_14px_0_#f0a8d8,0_28px_56px_rgba(200,90,150,0.35)]"
            initial={{ scale: 0.86, y: 40, opacity: 0, rotate: -1.5 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-[#ffd0ea] px-6 pb-4 pt-6">
              <div className="flex items-start gap-3">
                <motion.span
                  className="text-4xl leading-none"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {emoji}
                </motion.span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d080b8]">
                    Memory card
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#5c3d58]">{landmark.name}</h2>
                  {landmark.date && (
                    <p className="mt-1 text-xs font-bold text-[#b878a8]">{landmark.date}</p>
                  )}
                  {landmark.tags && landmark.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {landmark.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border-2 border-[#ffd6ef] bg-[#fff5fb] px-2.5 py-0.5 text-[10px] font-bold text-[#c06098]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                className="rounded-full border-2 border-[#f5cce8] bg-white px-3 py-1.5 text-xs font-extrabold text-[#b070a0] shadow-sm"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
              >
                Back to map
              </motion.button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-2xl border-2 border-[#ffb8e0] bg-gradient-to-r from-[#ffc8f0] to-[#ffd8c8] px-4 py-2 text-xs font-extrabold text-white shadow-[0_4px_0_#e888c0]"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  + Add photo
                </motion.button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onAddPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="text-[11px] font-semibold text-[#c090b0]">
                  Drag photos like little stickers on your page.
                </span>
              </div>

              {landmark.images.length > 0 && (
                <div
                  ref={stickersRef}
                  className="relative mt-5 min-h-[14rem] overflow-hidden rounded-3xl border-2 border-dashed border-[#f5b8e0] bg-[#fff5fb]/80"
                >
                  {landmark.images.map((img, idx) => (
                    <PhotoSticker
                      key={img.id}
                      img={img}
                      index={idx}
                      stickersRef={stickersRef}
                      onCaptionChange={onCaptionChange}
                      onRemoveImage={onRemoveImage}
                    />
                  ))}
                </div>
              )}

              <section className="mt-8 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#d080b8]">
                    Diary notes
                  </h3>
                  <button
                    type="button"
                    onClick={addParagraph}
                    className="text-[11px] font-extrabold text-[#e060a0] hover:underline"
                  >
                    + New note
                  </button>
                </div>
                {texts.map((para, idx) => (
                  <motion.div
                    key={`${landmark.id}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: idx * 0.06,
                      type: "spring",
                      stiffness: 320,
                      damping: 22,
                    }}
                  >
                    <div className="mb-2 min-h-[1.1rem] rounded-xl bg-[#fff8fc]/80 px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#a07098]">
                      <TypeReveal text={para} active={open} />
                    </div>
                    <textarea
                      value={para}
                      onChange={(e) => setParagraph(idx, e.target.value)}
                      rows={4}
                      className="w-full resize-y rounded-2xl border-2 border-[#f5cce8] bg-white/95 px-4 py-3 text-[15px] font-medium leading-relaxed text-[#4a3548] shadow-inner outline-none placeholder:text-[#d0b0c8] focus:border-[#ffb8e8]"
                      placeholder="Write it like a quiet diary entry…"
                    />
                  </motion.div>
                ))}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
