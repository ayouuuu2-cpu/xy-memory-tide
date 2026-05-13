"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RORY_AVATAR_FRAME, RORY_SEAL, RORY_SIDEBAR_CELEBRATE, RORY_SIDEBAR_IDLE, RORY_TYPING } from "@/lib/rory-assets";
import { persistNoteRitualSeal } from "@/lib/note-ritual-persist";
import { persistStationeryDraft } from "@/lib/stationery-draft-storage";
import { burstMemoryTideGoldenSealConfetti } from "@/lib/rory-confetti";
import {
  dispatchRoryStationeryCelebrate,
  dispatchRoryStationeryClose,
  dispatchRoryStationeryOpen,
  dispatchRoryStationeryTyping,
} from "@/lib/rory-stationery-events";
import { loadPersistedIdentity, savePersistedIdentity } from "@/lib/user-identity";
import { touchRoryActivity } from "@/lib/rory-activity";

const WASHI_PURPLE = "/images/decoration/washi-tape-purple.svg";

type Strand = "trace" | "wish";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

function isSealSparkleCalendarDay(): boolean {
  const d = new Date();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return (m === 9 && day === 14) || (m === 11 && day === 12);
}

function PaperEdgeRoryBuddy({
  celebrate,
  swaying,
}: {
  celebrate: boolean;
  swaying: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-[22] flex w-[min(34%,118px)] -translate-y-[40%] translate-x-[4%] flex-col items-center select-none"
      aria-hidden
    >
      <div className="relative flex h-[96px] w-full items-end justify-center">
        <div className="relative flex h-[86px] w-[86px] items-end justify-center">
          <AnimatePresence mode="sync" initial={false}>
            {celebrate ? (
              <motion.div
                key="rory-celebrate"
                className="absolute inset-0 flex items-end justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <motion.div
                  className="relative flex h-full w-full items-end justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.85, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="relative h-[80px] w-[80px] shrink-0">
                    <Image
                      src={RORY_SIDEBAR_CELEBRATE}
                      alt=""
                      fill
                      className="object-contain object-bottom drop-shadow-[0_8px_18px_rgba(80,40,120,0.35)]"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="rory-typing"
                className="absolute inset-0 flex items-end justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <motion.div
                  className="relative flex h-full w-full items-end justify-center"
                  animate={swaying ? { x: [-4, 5, -3, 4, -4] } : { x: 0 }}
                  transition={
                    swaying
                      ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.25 }
                  }
                >
                  <div className="relative h-[78px] w-[78px] shrink-0">
                    <Image
                      src={RORY_TYPING}
                      alt=""
                      fill
                      className="object-contain object-bottom drop-shadow-[0_6px_14px_rgba(40,20,10,0.35)]"
                      sizes="78px"
                      unoptimized
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

type RitualPhase =
  | "hidden"
  | "seal_only"
  | "cracking"
  | "ascend"
  | "edit"
  | "fold_1"
  | "fold_2"
  | "fold_3"
  | "fly";

type Props = {
  open: boolean;
  pendingNoteId: string;
  initialContent: string;
  entrance: "compose" | "unwrap";
  strand: Strand;
  worldMarkId: string | null;
  avatarUrl: string | null;
  displayName: string;
  onCommit: (content: string) => Promise<boolean>;
  onEnvelopeDelivered?: (noteId: string) => void;
  onFullyClosed: () => void;
};

export function StationeryNoteEditor({
  open,
  pendingNoteId,
  initialContent,
  entrance,
  strand,
  worldMarkId,
  avatarUrl,
  displayName,
  onCommit,
  onEnvelopeDelivered,
  onFullyClosed,
}: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<RitualPhase>("hidden");
  const [sealSplit, setSealSplit] = useState(false);
  const [fly, setFly] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    rot: number;
    midLeft: number;
    midTop: number;
  } | null>(null);

  const sealStageRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const crossed100Ref = useRef(false);
  const persistAfterFlyRef = useRef<{ content: string; persist: boolean } | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [textAreaFocused, setTextAreaFocused] = useState(false);
  const [typingSwayHold, setTypingSwayHold] = useState(false);
  const swayClearTimerRef = useRef<number | null>(null);

  const strandTitle = strand === "trace" ? "拾遗" : "未竟";
  const sparkleDay = isSealSparkleCalendarDay();
  const themeClass = strand === "trace" ? "stationery-theme-trace" : "stationery-theme-wish";

  useLayoutEffect(() => {
    if (!open) {
      setPhase("hidden");
      setFly(null);
      setSealSplit(false);
      persistAfterFlyRef.current = null;
      setTextAreaFocused(false);
      setTypingSwayHold(false);
      if (swayClearTimerRef.current) window.clearTimeout(swayClearTimerRef.current);
      return;
    }
    setText(initialContent);
    setSealSplit(false);
    setFly(null);
    crossed100Ref.current = false;
    persistAfterFlyRef.current = null;
    setLocalAvatar(loadPersistedIdentity()?.avatarUrl?.trim() || avatarUrl);
    setPhase("seal_only");
    setTextAreaFocused(false);
    setTypingSwayHold(false);
    if (swayClearTimerRef.current) window.clearTimeout(swayClearTimerRef.current);
  }, [open, initialContent, pendingNoteId, avatarUrl, worldMarkId]);

  const effectiveAvatar = localAvatar ?? avatarUrl;

  useEffect(() => {
    if (open && phase === "edit") dispatchRoryStationeryOpen();
    else if (!open || phase === "hidden") dispatchRoryStationeryClose();
  }, [open, phase]);

  useEffect(() => {
    if (!open || phase !== "edit") return;
    if (text.length < 100) {
      crossed100Ref.current = false;
      return;
    }
    if (crossed100Ref.current) return;
    crossed100Ref.current = true;
    dispatchRoryStationeryCelebrate();
    touchRoryActivity();
    burstMemoryTideGoldenSealConfetti();
  }, [text, open, phase]);

  useEffect(() => {
    if (!open || phase !== "edit") return;
    persistStationeryDraft(pendingNoteId, text);
  }, [open, phase, pendingNoteId, text]);

  useEffect(() => {
    if (phase !== "edit") setTextAreaFocused(false);
  }, [phase]);

  const emitTyping = useCallback(() => {
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      dispatchRoryStationeryTyping();
      touchRoryActivity();
    }, 110);
  }, []);

  const pickAvatar = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setLocalAvatar(url);
    const prev = loadPersistedIdentity();
    savePersistedIdentity({
      displayName: (prev?.displayName || displayName).trim() || displayName,
      avatarUrl: url,
      settledAt: Date.now(),
    });
  };

  const finishClose = useCallback(() => {
    const job = persistAfterFlyRef.current;
    persistAfterFlyRef.current = null;
    if (job?.persist) {
      persistNoteRitualSeal({
        markId: worldMarkId,
        noteId: pendingNoteId,
        strand,
        fullContent: job.content,
        contentPreview: job.content.slice(0, 160),
        contentLength: job.content.length,
        sealedAt: Date.now(),
      });
      // Fire-and-forget: do not block UI close on cloud sync.
      void onCommit(job.content).then((ok) => {
        if (!ok) return;
        dispatchRoryStationeryCelebrate();
        touchRoryActivity();
        burstMemoryTideGoldenSealConfetti();
      });
    }
    onEnvelopeDelivered?.(pendingNoteId);
    setFly(null);
    setSealSplit(false);
    setPhase("hidden");
    dispatchRoryStationeryClose();
    onFullyClosed();
  }, [onFullyClosed, onEnvelopeDelivered, onCommit, pendingNoteId, strand, worldMarkId]);

  const beginFlyToSlot = useCallback(() => {
    const originEl = paperRef.current ?? sealStageRef.current;
    const origin = originEl?.getBoundingClientRect();
    const slot = document.querySelector(`[data-note-envelope-slot="${pendingNoteId}"]`) as HTMLElement | null;
    const anchor = document.querySelector("[data-note-envelope-fly-anchor]") as HTMLElement | null;
    const targetEl = slot ?? anchor;
    const t = targetEl?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x0 = origin ? origin.left + origin.width / 2 : vw / 2;
    const y0 = origin ? origin.top + origin.height / 2 : vh / 2;
    const x1 = t ? t.left + t.width / 2 : vw * 0.82;
    const y1 = t ? t.top + t.height / 2 : vh * 0.35;
    const rot = -6 + Math.random() * 12;
    const bulge = Math.min(200, vh * 0.22);
    const midLeft = (x0 + x1) / 2 - 54 + (x0 < x1 ? vw * 0.04 : -vw * 0.04);
    const midTop = Math.min(y0, y1) - 38 - bulge;
    setFly({ x0, y0, x1, y1, rot, midLeft, midTop });
    setPhase("fly");
  }, [pendingNoteId]);

  const runOpening = useCallback(async () => {
    if (phase !== "seal_only" || busy) return;
    setBusy(true);
    try {
      setPhase("cracking");
      setSealSplit(true);
      await sleep(480);
      setSealSplit(false);
      setPhase("ascend");
      await sleep(720);
      setPhase("edit");
    } finally {
      setBusy(false);
    }
  }, [phase, busy]);

  const runClosingAndPersist = useCallback(async () => {
    if (phase !== "edit" || busy) return;
    setBusy(true);
    try {
      setPhase("fold_1");
      await sleep(400);
      setPhase("fold_2");
      await sleep(400);
      setPhase("fold_3");
      await sleep(460);
      persistAfterFlyRef.current = { content: text.trim(), persist: true };
      beginFlyToSlot();
    } finally {
      setBusy(false);
    }
  }, [phase, busy, text, beginFlyToSlot]);

  const runClosingDiscard = useCallback(async () => {
    if (phase !== "edit" || busy) return;
    setBusy(true);
    try {
      setPhase("fold_1");
      await sleep(400);
      setPhase("fold_2");
      await sleep(400);
      setPhase("fold_3");
      await sleep(460);
      persistAfterFlyRef.current = { content: text.trim(), persist: false };
      beginFlyToSlot();
    } finally {
      setBusy(false);
    }
  }, [phase, busy, text, beginFlyToSlot]);

  /** 与地图上选点无关：仅控制火漆信封叠层 */
  const showEnvelope = phase === "seal_only" || phase === "cracking";
  /** 拆信后的信纸（含展开与折叠回收），禁止背景/Esc 等自动.dismiss */
  const showPaper =
    phase === "ascend" || phase === "edit" || phase === "fold_1" || phase === "fold_2" || phase === "fold_3";
  const paperFoldClass =
    phase === "fold_1"
      ? "stationery-fold-a"
      : phase === "fold_2"
        ? "stationery-fold-b"
        : phase === "fold_3"
          ? "stationery-fold-c"
          : "";
  /** 打字态用 rory-typing；仅满百字时用 celebrate（共鸣日不累加盖住打字） */
  const celebrateRory = text.length >= 100;
  const swayingRory = textAreaFocused || typingSwayHold;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showPaper) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (phase === "seal_only") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, phase, showPaper]);

  return (
    <AnimatePresence>
      {open && phase !== "hidden" ? (
        <motion.div
          key="stationery-root"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[540] relative"
        >
          {sparkleDay ? (
            <div className="memory-tide-stationery-birthday-halo pointer-events-none absolute inset-0 z-0" aria-hidden />
          ) : null}

          {phase === "seal_only" || phase === "cracking" ? (
            <div className="absolute inset-0 bg-[#0a0518]/78 backdrop-blur-[4px] pointer-events-none" aria-hidden />
          ) : showPaper || phase === "fly" ? (
            <div className="absolute inset-0 bg-[#0a0518]/80 backdrop-blur-[5px] pointer-events-none" aria-hidden />
          ) : null}

          {showEnvelope ? (
            <div className="pointer-events-none fixed inset-0 z-[545] flex items-center justify-center px-4">
              <button
                type="button"
                className="pointer-events-auto fixed right-4 top-4 z-[548] rounded-full border border-violet-200/35 bg-violet-950/55 px-3 py-1.5 font-serif text-sm text-violet-100 shadow-lg backdrop-blur-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label="关闭"
                title="请点击火漆启封"
              >
                ×
              </button>
              <div ref={sealStageRef} className="ritual-note-root pointer-events-auto relative w-[min(92vw,400px)]">
                {phase === "seal_only" ? (
                  <div className={`ritual-envelope-panel ${themeClass} relative overflow-hidden rounded-[14px] px-5 pb-24 pt-14 shadow-2xl`}>
                    <div className="pointer-events-none absolute left-2 top-3 z-[15] w-[38%] max-w-[7rem] opacity-88" style={{ transform: "rotate(-16deg)" }}>
                      <div className="washi-tape-torn drop-shadow-sm">
                        <Image src={WASHI_PURPLE} alt="" width={120} height={32} className="h-auto w-full opacity-90" unoptimized />
                      </div>
                    </div>
                    <div className="pointer-events-none absolute right-2 top-8 z-[15] w-[36%] max-w-[6.5rem] opacity-82" style={{ transform: "rotate(12deg)" }}>
                      <div className="washi-tape-torn drop-shadow-sm">
                        <Image src={WASHI_PURPLE} alt="" width={110} height={30} className="h-auto w-full opacity-85" unoptimized />
                      </div>
                    </div>
                    <div className="ritual-envelope-flap ritual-envelope-flap--shut absolute left-[6%] right-[6%] top-0 z-[5] h-[46%] rounded-t-[12px]">
                      <div className="absolute bottom-2 left-1/2 z-[25] flex -translate-x-1/2 flex-col items-center">
                        <div className={`relative ${sparkleDay ? "ritual-seal-sparkle" : ""}`}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runOpening()}
                            className={`ritual-wax-hit relative rounded-full border-0 bg-transparent p-0 ${sparkleDay ? "ritual-wax-breath" : ""}`}
                            aria-label="启封火漆"
                          >
                            <div className="ritual-seal-crack flex items-center justify-center">
                              <Image
                                src={RORY_SEAL}
                                alt=""
                                width={220}
                                height={220}
                                className="h-[min(44vw,11rem)] w-[min(44vw,11rem)] select-none object-contain drop-shadow-[0_14px_32px_rgba(40,8,16,0.5)]"
                                unoptimized
                              />
                            </div>
                          </button>
                        </div>
                        <p className="font-note-paper mt-2 text-center text-[14px] leading-relaxed text-violet-200/88">
                          Rory 为你守着呢。
                        </p>
                      </div>
                    </div>
                    <div className="pointer-events-none relative z-[2] mt-[min(36vw,9rem)] min-h-[7rem]" aria-hidden />
                  </div>
                ) : (
                  <div className={`ritual-envelope-panel ${themeClass} relative overflow-hidden rounded-[14px] px-5 pb-20 pt-12 shadow-2xl`}>
                    <div className="ritual-envelope-flap ritual-envelope-flap--shut absolute left-[6%] right-[6%] top-0 z-[5] h-[46%] rounded-t-[12px]">
                      <div className="absolute bottom-2 left-1/2 z-[25] flex -translate-x-1/2 flex-col items-center">
                        <div className={`relative ${sparkleDay ? "ritual-seal-sparkle" : ""}`}>
                          <div className={`ritual-seal-crack ${sealSplit ? "ritual-seal-crack--split" : ""}`}>
                            <div className="ritual-seal-crack__line" />
                            <div className="ritual-seal-crack__half ritual-seal-crack__half--l">
                              <Image
                                src={RORY_SEAL}
                                alt=""
                                width={176}
                                height={176}
                                className="h-full w-auto max-w-none select-none object-cover object-left"
                                unoptimized
                              />
                            </div>
                            <div className="ritual-seal-crack__half ritual-seal-crack__half--r">
                              <Image
                                src={RORY_SEAL}
                                alt=""
                                width={176}
                                height={176}
                                className="h-full w-auto max-w-none select-none object-cover object-right"
                                unoptimized
                              />
                            </div>
                            <div className="pointer-events-none absolute inset-[16%] z-[30] overflow-hidden rounded-full border border-[#4a0a12]/40 shadow-[inset_0_1px_3px_rgba(255,220,210,0.35)]">
                              <Image
                                src={RORY_SIDEBAR_IDLE}
                                alt=""
                                width={72}
                                height={72}
                                className="h-full w-full object-cover object-center"
                                unoptimized
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {showPaper ? (
            <motion.div
              key="stationery-paper"
              role="dialog"
              aria-modal="true"
              aria-label="手记编辑"
              initial={{ scale: 0.78, opacity: 0.55, y: 48 }}
              animate={
                phase === "fold_1" || phase === "fold_2" || phase === "fold_3"
                  ? { scale: 0.88, opacity: 0.95, y: 8 }
                  : { scale: 1, opacity: 1, y: 0 }
              }
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto fixed inset-0 z-[542] flex cursor-default items-center justify-center px-4 py-8"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div
                ref={paperRef}
                className={`stationery-journal-card ${themeClass} stationery-paper-fold-root stationery-paper-texture relative w-full max-w-lg cursor-auto border border-violet-300/30 p-5 pb-6 pt-7 shadow-[0_28px_70px_rgba(24,12,40,0.55)] ${paperFoldClass}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative z-[4] border-b border-dashed border-violet-300/35 pb-4 font-serif">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busy || phase !== "edit"}
                      onClick={() => void runClosingDiscard()}
                      className="stationery-minimal-btn inline-flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none"
                      aria-label="关闭信纸"
                    >
                      ×
                    </button>
                  </div>
                  <div className="-mt-1 flex flex-col items-center px-2 pt-0">
                    <div className="relative mb-3 flex h-[1.5rem] w-full max-w-[15rem] justify-center">
                      <div className="pointer-events-none absolute left-[8%] top-0 z-[2] w-[58%] max-w-[9.5rem]" style={{ transform: "rotate(-11deg)" }}>
                        <div className="washi-tape-torn">
                          <Image src={WASHI_PURPLE} alt="" width={130} height={34} className="h-auto w-full opacity-90" unoptimized />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute right-[10%] top-0.5 z-[2] w-[52%] max-w-[8.5rem]" style={{ transform: "rotate(14deg)" }}>
                        <div className="washi-tape-torn">
                          <Image src={WASHI_PURPLE} alt="" width={118} height={32} className="h-auto w-full opacity-85" unoptimized />
                        </div>
                      </div>
                    </div>
                    <div className="relative mx-auto h-[72px] w-[72px] shrink-0">
                      <Image
                        src={RORY_AVATAR_FRAME}
                        alt=""
                        width={72}
                        height={72}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_3px_12px_rgba(40,22,60,0.2)]"
                        unoptimized
                      />
                      <button
                        type="button"
                        className="stationery-avatar-scribble absolute inset-[12px] overflow-hidden bg-violet-50/88 ring-1 ring-violet-950/10"
                        onClick={() => avatarInputRef.current?.click()}
                        aria-label="上传头像"
                      >
                        {effectiveAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={effectiveAvatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-base text-violet-900/72" aria-hidden>
                            {displayName.slice(0, 1) || " "}
                          </span>
                        )}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => pickAvatar(e.target.files)}
                      />
                    </div>
                    <p className="mt-3 text-center text-lg font-medium tracking-[0.12em] text-violet-950/95">{strandTitle}</p>
                    {displayName.trim() ? (
                      <p className="font-note-paper mt-0.5 max-w-[16rem] truncate text-center text-[14px] leading-relaxed text-violet-800/82">
                        {displayName}
                      </p>
                    ) : null}
                    <p className="font-note-paper mt-0.5 text-center text-[15px] leading-relaxed text-violet-500/90">
                      来写点什么吧？
                    </p>
                  </div>
                </div>

                <div className="relative mt-1" style={{ transform: "rotate(-0.5deg)" }}>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      emitTyping();
                      setTypingSwayHold(true);
                      if (swayClearTimerRef.current) window.clearTimeout(swayClearTimerRef.current);
                      swayClearTimerRef.current = window.setTimeout(() => {
                        setTypingSwayHold(false);
                        swayClearTimerRef.current = null;
                      }, 780);
                    }}
                    onFocus={() => {
                      setTextAreaFocused(true);
                    }}
                    onBlur={() => setTextAreaFocused(false)}
                    rows={10}
                    disabled={busy || phase !== "edit"}
                    className="font-note-paper stationery-ruled-textarea relative z-[10] mt-2 w-full resize-y rounded-xl border border-violet-200/35 bg-[#fffdf8]/88 py-2 pl-3 pr-[5.5rem] text-[15px] leading-relaxed text-[#2f2438] shadow-inner outline-none ring-0 placeholder:text-violet-900/35 focus:border-violet-400/55 sm:pr-[6.25rem]"
                    placeholder="在这里写下手记…"
                  />
                  <PaperEdgeRoryBuddy celebrate={celebrateRory} swaying={swayingRory} />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    disabled={busy || phase !== "edit"}
                    onClick={() => void runClosingAndPersist()}
                    className="stationery-minimal-btn rounded-full px-5 py-2.5 text-[20px] leading-none"
                  >
                    {busy ? "封存中…" : "封存记忆"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}

          {phase === "fly" && fly ? (
            <motion.div
              className="pointer-events-none fixed z-[560] h-[76px] w-[108px] rounded-md border border-violet-900/35 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
              style={{
                background: "linear-gradient(145deg,#ebe2d4,#d4c4f0)",
                left: fly.x0 - 54,
                top: fly.y0 - 38,
              }}
              initial={{ scale: 1, opacity: 1, rotate: fly.rot }}
              animate={{
                left: [fly.x0 - 54, fly.midLeft, fly.x1 - 54],
                top: [fly.y0 - 38, fly.midTop, fly.y1 - 38],
                scale: [1, 0.52, 0.34],
                opacity: [1, 0.96, 0.88],
                rotate: [fly.rot, fly.rot * 0.35, 0],
              }}
              transition={{
                duration: 0.82,
                times: [0, 0.5, 1],
                ease: "easeInOut",
              }}
              onAnimationComplete={() => void finishClose()}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src={RORY_SEAL} alt="" width={44} height={44} className="opacity-95 drop-shadow" unoptimized />
              </div>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
