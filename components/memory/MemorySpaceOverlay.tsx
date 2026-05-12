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

const ease = [0.22, 1, 0.36, 1] as const;

function stickerTilt(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ((h % 17) - 8) * 0.45;
}

/** Organic wall positions — not a grid. */
function stickerSlot(seed: string, index: number) {
  let h = 0;
  const key = `${seed}-${index}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const left = 18 + (h % 52);
  const top = 12 + ((h >>> 5) % 58);
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
  entranceIndex,
  stickersRef,
  wallHoverId,
  onWallHover,
  isDimmed,
  isArrival,
  onCaptionChange,
  onRemoveImage,
}: {
  img: LandmarkMemory["images"][0];
  index: number;
  entranceIndex: number;
  stickersRef: RefObject<HTMLDivElement | null>;
  wallHoverId: string | null;
  onWallHover: (id: string | null) => void;
  isDimmed: boolean;
  isArrival: boolean;
  onCaptionChange: (imageId: string, caption: string) => void;
  onRemoveImage: (imageId: string) => void;
}) {
  const tilt = useMemo(() => stickerTilt(img.id), [img.id]);
  const slot = useMemo(() => stickerSlot(img.id, index), [img.id, index]);
  const [glowPhase, setGlowPhase] = useState(isArrival);

  useEffect(() => {
    if (!isArrival) {
      setGlowPhase(false);
      return;
    }
    setGlowPhase(true);
    const t = window.setTimeout(() => setGlowPhase(false), 420);
    return () => window.clearTimeout(t);
  }, [isArrival, img.id]);

  const isHover = wallHoverId === img.id;

  return (
    <motion.div
      drag
      dragConstraints={stickersRef}
      dragElastic={0.1}
      initial={
        isArrival
          ? { scale: 0.78, rotate: tilt - 4, opacity: 0, filter: "blur(14px)" }
          : { scale: 0.92, rotate: tilt - 3, opacity: 0, filter: "blur(6px)" }
      }
      animate={{
        scale: isHover ? 1.04 : 1,
        rotate: tilt,
        opacity: isDimmed ? 0.38 : 1,
        filter: "blur(0px)",
        y: isHover ? -6 : 0,
        zIndex: isHover ? 4 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: isArrival ? 280 : 320,
        damping: isArrival ? 26 : 30,
        delay: isArrival ? 0.38 : 0.32 + entranceIndex * 0.15,
        opacity: { duration: 0.55, ease },
      }}
      style={{
        position: "absolute",
        left: `${slot.left}%`,
        top: `${slot.top}%`,
      }}
      className="w-[min(7.5rem,28vw)] cursor-grab active:cursor-grabbing"
      onPointerEnter={() => onWallHover(img.id)}
      onPointerLeave={() => onWallHover(null)}
    >
      <AnimatePresence>
        {glowPhase && (
          <motion.div
            key="glow"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300/35 blur-xl"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 0.85 }}
            exit={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.55, ease }}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="rounded-2xl border border-white/[0.12] bg-[#0a0812]/40 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(180,160,255,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
        whileHover={{ boxShadow: "0 20px 48px rgba(40,20,60,0.55), 0 0 0 1px rgba(200,180,255,0.12)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
      </motion.div>
      <input
        type="text"
        value={img.caption}
        placeholder="whisper a label…"
        onChange={(e) => onCaptionChange(img.id, e.target.value)}
        className="mt-2 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-1.5 text-[10px] text-violet-100/80 outline-none ring-0 transition placeholder:text-violet-500/35 focus:border-violet-400/25 focus:bg-white/[0.07] focus:shadow-[0_0_0_1px_rgba(160,140,220,0.2)]"
      />
      <button
        type="button"
        onClick={() => onRemoveImage(img.id)}
        className="mt-1 w-full text-[10px] font-medium uppercase tracking-wide text-rose-300/55 transition hover:text-rose-200/90"
      >
        release
      </button>
    </motion.div>
  );
}

function AmbientField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-1/4 top-0 h-[120%] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(120,90,200,0.14),transparent_68%)] blur-3xl"
        animate={{ x: [0, 28, -12, 0], y: [0, 18, 8, 0] }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-0 h-[100%] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(60,100,180,0.1),transparent_70%)] blur-3xl"
        animate={{ x: [0, -22, 14, 0], y: [0, -14, 6, 0] }}
        transition={{ duration: 56, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_100%,rgba(8,6,18,0.5),transparent_55%)]" />
    </div>
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
  const [wallHoverId, setWallHoverId] = useState<string | null>(null);
  const [arrivalId, setArrivalId] = useState<string | null>(null);
  const prevImageIdsRef = useRef<Set<string>>(new Set());
  const seededForOpenRef = useRef(false);

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

  const imageSig = landmark?.images.map((i) => i.id).join("|") ?? "";

  useEffect(() => {
    if (!open || !landmark) {
      seededForOpenRef.current = false;
      return;
    }
    if (!seededForOpenRef.current) {
      prevImageIdsRef.current = new Set(landmark.images.map((i) => i.id));
      seededForOpenRef.current = true;
      return;
    }
    const now = new Set(landmark.images.map((i) => i.id));
    for (const im of landmark.images) {
      if (!prevImageIdsRef.current.has(im.id)) {
        setArrivalId(im.id);
        window.setTimeout(() => setArrivalId(null), 2600);
        break;
      }
    }
    prevImageIdsRef.current = now;
  }, [open, landmark?.id, imageSig]);

  const onWallDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) onAddPhotos(e.dataTransfer.files);
    },
    [onAddPhotos],
  );

  return (
    <AnimatePresence>
      {open && landmark && (
        <motion.div
          className="fixed inset-0 z-[50] flex items-center justify-center px-3 py-6 sm:px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(50,40,90,0.35),rgba(4,3,12,0.92))] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <AmbientField />

          <motion.button
            type="button"
            aria-label="Close"
            className="pointer-events-auto absolute inset-0 z-[5]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="pointer-events-auto relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(165deg,rgba(14,12,24,0.92)_0%,rgba(8,7,16,0.96)_45%,rgba(5,4,12,0.98)_100%)] shadow-[0_0_0_1px_rgba(120,100,180,0.05),0_40px_100px_rgba(0,0,0,0.55)] backdrop-blur-md"
            initial={{ scale: 0.94, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <header className="relative flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-6 pb-4 pt-6">
              <div className="flex items-start gap-3">
                <motion.span
                  className="text-3xl leading-none opacity-90"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {emoji}
                </motion.span>
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-400/50">
                    Memory field
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-[#faf8ff]/95">{landmark.name}</h2>
                  {landmark.date && <p className="mt-1.5 text-[11px] tracking-[0.14em] text-violet-400/45">{landmark.date}</p>}
                  {landmark.tags && landmark.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {landmark.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-violet-200/55"
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
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-100/75 transition hover:border-violet-400/30 hover:bg-white/[0.08]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Back to map
              </motion.button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden lg:flex-row lg:overflow-hidden">
                {/* Left — writing surface */}
                <div className="relative flex min-h-0 flex-col border-white/[0.05] px-6 py-6 lg:w-[min(38%,22rem)] lg:shrink-0 lg:border-r lg:py-7">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,255,0.03)_0%,transparent_40%)]" />
                  <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
                    <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.26em] text-violet-500/40">Write into the field</p>
                    <div
                      className="mb-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center transition hover:border-violet-400/20 hover:bg-white/[0.04]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={onWallDrop}
                    >
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
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-[11px] font-medium text-violet-200/55 transition hover:text-violet-100/85"
                      >
                        Drop images here or tap to add
                      </button>
                    </div>

                    <section className="flex min-h-0 flex-1 flex-col space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-500/40">Fragments</h3>
                        <button
                          type="button"
                          onClick={addParagraph}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-violet-400/50 transition hover:text-violet-200/75"
                        >
                          + another line
                        </button>
                      </div>
                      {texts.map((para, idx) => (
                        <motion.div
                          key={`${landmark.id}-${idx}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28 + idx * 0.11, duration: 0.62, ease }}
                          className="flex flex-col"
                        >
                          <div className="mb-2 min-h-[1rem] rounded-lg bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-violet-300/40">
                            <TypeReveal text={para} active={open} />
                          </div>
                          <textarea
                            value={para}
                            onChange={(e) => setParagraph(idx, e.target.value)}
                            rows={4}
                            className="w-full resize-y rounded-2xl border border-white/[0.07] bg-[#08060f]/50 px-4 py-3 text-[14px] leading-[1.65] text-violet-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none ring-0 transition placeholder:text-violet-500/30 focus:border-violet-400/25 focus:bg-[#0a0814]/65 focus:shadow-[inset_0_0_0_1px_rgba(140,120,200,0.12)]"
                            placeholder="Let the sentence arrive slowly…"
                          />
                        </motion.div>
                      ))}
                    </section>
                  </div>
                </div>

                {/* Right — memory wall (organic, not a list/table) */}
                <div className="relative flex min-h-[16rem] flex-1 flex-col px-6 py-6 lg:min-h-0 lg:px-7 lg:py-7">
                  <div className="pointer-events-none absolute inset-0 opacity-90 [mask-image:radial-gradient(ellipse_85%_75%_at_50%_45%,black,transparent)]">
                    <div className="absolute inset-0 backdrop-blur-[0.5px]" />
                  </div>
                  <p className="relative z-[1] mb-3 text-[10px] font-medium uppercase tracking-[0.26em] text-violet-500/35">
                    In space
                  </p>
                  <div
                    ref={stickersRef}
                    className="relative z-[1] min-h-[14rem] flex-1 overflow-visible rounded-2xl border border-white/[0.05] bg-[radial-gradient(ellipse_at_30%_20%,rgba(80,60,120,0.08),transparent_50%),#05040c]/80 lg:min-h-[18rem]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onWallDrop}
                  >
                    {landmark.images.length === 0 ? (
                      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] leading-relaxed text-violet-500/35">
                        Memories you add will drift onto this wall — never as a list.
                      </p>
                    ) : (
                      landmark.images.map((img, idx) => (
                        <PhotoSticker
                          key={img.id}
                          img={img}
                          index={idx}
                          entranceIndex={idx}
                          stickersRef={stickersRef}
                          wallHoverId={wallHoverId}
                          onWallHover={setWallHoverId}
                          isDimmed={wallHoverId !== null && wallHoverId !== img.id}
                          isArrival={arrivalId === img.id}
                          onCaptionChange={onCaptionChange}
                          onRemoveImage={onRemoveImage}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
