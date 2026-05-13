"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RORY_CLICK,
  RORY_SEAL,
  RORY_SIDEBAR_CELEBRATE,
  RORY_SIDEBAR_IDLE,
  RORY_SIDEBAR_SLEEPY,
  RORY_TYPING,
} from "@/lib/rory-assets";
import { CssRoryWashiTape } from "@/components/memory-quest/CssRoryWashiTape";

type Slide =
  | { kind: "washi" }
  | { kind: "rory"; title: string; src: string; body: string; seal?: boolean }
  | { kind: "photo" }
  | { kind: "atmosphere" };

const SLIDES: Slide[] = [
  { kind: "washi" },
  {
    kind: "rory",
    title: "Idle · 守候",
    src: RORY_SIDEBAR_IDLE,
    body: "默认常驻在展示栏旁，像一颗安静的星，陪你整理拾遗与未竟。",
  },
  {
    kind: "rory",
    title: "Sleepy · 打盹",
    src: RORY_SIDEBAR_SLEEPY,
    body: "若许久未与记忆互动（本地记录超过约 3 天），Rory 会轻轻打盹，提醒你回来写一笔。",
  },
  {
    kind: "rory",
    title: "Typing · 陪伴",
    src: RORY_TYPING,
    body: "手记打开并在信纸上输入时，Rory 会换成打字陪伴态，在信纸边轻轻晃动。",
  },
  {
    kind: "rory",
    title: "Celebrate · 举星",
    src: RORY_SIDEBAR_CELEBRATE,
    body: "长文超过约 100 字或保存成功时，Rory 举起星星，同时会有星屑洒落庆祝。",
  },
  {
    kind: "rory",
    title: "Click · 回应",
    src: RORY_CLICK,
    body: "强调「被点到」的瞬间（例如未来在地球上点选记忆星时的反馈立绘）。",
  },
  {
    kind: "rory",
    title: "Seal · 火漆",
    src: RORY_SEAL,
    body: "信纸三段折叠后，视觉上收束成信封，中央压上 Rory 主题火漆，再沿弧线飞回侧栏信封槽，强调物理手感。",
    seal: true,
  },
  { kind: "photo" },
  { kind: "atmosphere" },
];

function PhotoWallDemo() {
  const chips = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((i) => ({
        id: i,
        left: 8 + ((i * 17) % 62),
        top: 12 + ((i * 23) % 48),
        rot: -10 + ((i * 37) % 210) / 10,
        s: 0.82 + (i % 3) * 0.06,
      })),
    [],
  );
  return (
    <div className="relative mx-auto mt-3 h-[150px] w-full max-w-md overflow-hidden rounded-xl border border-violet-300/25 bg-[radial-gradient(ellipse_at_50%_20%,rgba(140,110,200,0.22),rgba(12,8,28,0.94))]">
      {chips.map((c) => (
        <div
          key={c.id}
          className="memory-tide-scatter-polaroid absolute w-[22%] rounded-[2px] bg-[#faf8ff] p-1 pb-4 shadow-lg ring-1 ring-violet-200/30"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            transform: `rotate(${c.rot}deg) scale(${c.s})`,
          }}
        >
          <div className="pointer-events-none absolute left-[12%] top-0 z-[1] w-[55%] -translate-y-[35%]">
            <CssRoryWashiTape moodKey={`scatter-${c.id}`} variant="polaroid" />
          </div>
          <div className="relative z-0 mt-1 h-8 rounded-[1px] bg-gradient-to-br from-violet-200/45 to-amber-100/35" />
        </div>
      ))}
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-violet-200/78">
        点击相册照片 → 全屏随机偏转洒落（示意）
      </p>
    </div>
  );
}

export function RoryAtelierSlideshowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  const slide = SLIDES[idx]!;

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, SLIDES.length - 1)), []);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="rory-atelier"
          role="dialog"
          aria-modal="true"
          aria-label="Rory 与手帐交互说明"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="memory-tide-atelier-backdrop fixed inset-0 z-[190] flex items-center justify-center p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 16, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="memory-tide-diary-font relative w-full max-w-lg overflow-hidden rounded-[1.15rem] border border-violet-200/25 bg-[#faf6ec] p-5 shadow-[0_24px_80px_rgba(8,4,24,0.65)]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(180,170,200,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(180,170,200,0.05) 1px,transparent 1px),radial-gradient(ellipse 100% 80% at 50% 0%,rgba(255,255,255,0.5),transparent 55%)",
              backgroundSize: "100% 1.25rem,1.1rem 100%,auto",
              backgroundPosition: "0 0.2rem,0 0,0 0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute left-1/2 top-0 z-[1] w-[min(72%,220px)] -translate-x-1/2 -translate-y-[38%]">
              <CssRoryWashiTape moodKey="atelier-intro" variant="banner" />
            </div>

            <div className="relative z-[2] pt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium tracking-[0.22em] text-violet-500/80">忆潮 · Rory</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-amber-900/20 px-2 py-0.5 text-sm text-amber-900/70"
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.28 }}
                  className="mt-4 min-h-[220px]"
                >
                  {slide.kind === "washi" ? (
                    <div>
                      <h2 className="text-lg font-medium tracking-wide text-amber-950/95">纯 CSS 和纸胶带</h2>
                      <p className="mt-2 text-sm leading-relaxed text-amber-950/80">
                        无需上传胶带素材：用渐变、透明度与撕纸感裁切模拟半透明和纸，并根据「心意种子」自动换色，贴在信纸顶端。
                      </p>
                      <div className="relative mx-auto mt-6 w-[88%] rounded-lg border border-amber-900/12 bg-[#fffdf8]/90 px-4 pb-8 pt-10 shadow-inner">
                        <div className="pointer-events-none absolute left-1/2 top-0 w-[78%] -translate-x-1/2 -translate-y-[45%]">
                          <CssRoryWashiTape moodKey="demo-note-拾遗" variant="banner" />
                        </div>
                        <p className="text-center text-xs text-amber-900/55">（示意信纸）</p>
                      </div>
                    </div>
                  ) : slide.kind === "photo" ? (
                    <div>
                      <h2 className="text-lg font-medium text-amber-950/95">泼墨式照片墙</h2>
                      <p className="mt-2 text-sm leading-relaxed text-amber-950/82">
                        在展示栏中点击任意照片，会打开全屏遮罩；所有该地点照片以随机坐标与约 ±10° 偏转瞬间洒满画面，并带白拍立得边与和纸胶带装饰。
                      </p>
                      <PhotoWallDemo />
                    </div>
                  ) : slide.kind === "atmosphere" ? (
                    <div>
                      <h2 className="text-lg font-medium text-amber-950/95">极致手帐氛围</h2>
                      <p className="mt-2 text-sm leading-relaxed text-amber-950/82">
                        背景为深紫色星空渐变；弹层与手记容器使用米黄信纸纹理与淡网格。正文优先采用{" "}
                        <span className="font-medium">Architects Daughter</span> 与{" "}
                        <span className="font-medium">Long Cang（龙仓）</span> 组合，营造私人日记般的书写感。
                      </p>
                    </div>
                  ) : slide.kind === "rory" && slide.seal ? (
                    <div>
                      <h2 className="text-lg font-medium text-amber-950/95">{slide.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-amber-950/82">{slide.body}</p>
                      <div className="mt-5 flex justify-center">
                        <div className="stationery-wax-seal-wrap rounded-full p-2">
                          <Image src={slide.src} alt="" width={88} height={88} className="stationery-wax-seal-img" unoptimized />
                        </div>
                      </div>
                    </div>
                  ) : slide.kind === "rory" ? (
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <div className="shrink-0 drop-shadow-[0_8px_24px_rgba(40,20,80,0.35)]">
                        <Image
                          src={slide.src}
                          alt=""
                          width={100}
                          height={100}
                          className="memory-tide-rory-ethereal h-[100px] w-auto object-contain object-bottom"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <h2 className="text-lg font-medium text-amber-950/95">{slide.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-amber-950/82">{slide.body}</p>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex max-w-[55%] flex-wrap gap-1">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`第 ${i + 1} 页`}
                      onClick={() => setIdx(i)}
                      className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${i === idx ? "bg-violet-600" : "bg-amber-900/25"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={prev}
                    className="rounded-full border border-amber-900/22 px-3 py-1.5 text-xs text-amber-900/80 disabled:opacity-35"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={idx >= SLIDES.length - 1}
                    onClick={next}
                    className="rounded-full border border-violet-400/45 bg-violet-600/90 px-3 py-1.5 text-xs text-white disabled:opacity-35"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
