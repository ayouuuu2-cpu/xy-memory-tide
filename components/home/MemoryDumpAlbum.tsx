"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoryTideBackground } from "@/components/memory-tide/MemoryTideBackground";
import { MEMORY_TIDE_HOME_EVENT, useHomeGate } from "@/contexts/HomeGateContext";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { fileAcceptsAsQuestPhoto, fileAcceptsAsQuestVideo } from "@/lib/quest-media-accept";
import { IdentityOnboardingModal } from "@/components/home/IdentityOnboardingModal";
import { MemoryDumpFragmentTile } from "@/components/home/MemoryDumpFragmentTile";
import { MemoryFragmentMedia } from "@/components/home/MemoryFragmentMedia";
import {
  deleteCloudFragment,
  fetchCloudGallery,
  isCloudGalleryClient,
  patchCloudFragment,
  uploadCloudFragment,
} from "@/lib/gallery-cloud";
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from "@/lib/supabase/browser";
import {
  loadMemoryDumpGallery,
  resolveMemoryDumpAuthor,
  saveMemoryDumpUploaderProfile,
  type GalleryAuthor,
  type GalleryItem,
} from "@/lib/memory-dump-storage";
import { maxGalleryItemsClient } from "@/lib/gallery-limits";
import { loadPersistedIdentity, needsIdentityOnboarding } from "@/lib/user-identity";
import type { RealtimeChannel } from "@supabase/supabase-js";

function scatterFor(id: string, index: number) {
  const h = (salt: number) => {
    const s = Math.sin(id.length * 7.919 + index * 12.9898 + salt * 3.141) * 43758.5453;
    return s - Math.floor(s);
  };
  const left = 6 + h(1) * 78;
  const top = 8 + h(2) * 70 + (index % 4) * 3;
  const rotate = -22 + h(3) * 44;
  const width = 118 + h(4) * 108;
  const z = 10 + Math.floor(h(5) * 35);
  return { left, top, rotate, width, z };
}

type Props = {
  onOpenPortals?: () => void;
};

export function MemoryDumpAlbum({ onOpenPortals }: Props) {
  const { homeVersion } = useHomeGate();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [draftCaption, setDraftCaption] = useState("");
  const [draftTs, setDraftTs] = useState("");
  const [draftMood, setDraftMood] = useState("");
  const [draftLoc, setDraftLoc] = useState("");
  const [draftAuthorName, setDraftAuthorName] = useState("");
  const [draftAuthorAvatar, setDraftAuthorAvatar] = useState("");
  const [identityOpen, setIdentityOpen] = useState(false);
  const useCloud = isCloudGalleryClient();
  const galleryCap = maxGalleryItemsClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (useCloud) {
        try {
          const remote = await fetchCloudGallery();
          if (!cancelled) setItems(remote);
        } catch {
          if (!cancelled) setItems(loadMemoryDumpGallery());
        }
      } else if (!cancelled) {
        setItems(loadMemoryDumpGallery());
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [useCloud]);

  /** Live sync when other devices mutate `memory_images` (enable Realtime on that table in Supabase). */
  useEffect(() => {
    if (!useCloud || !hasSupabaseBrowserConfig()) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    try {
      const sb = getSupabaseBrowser();
      const reload = () => {
        if (cancelled) return;
        void fetchCloudGallery()
          .then((list) => {
            if (!cancelled) setItems(list);
          })
          .catch(() => {});
      };
      channel = sb
        .channel("memory-tide-memory-images")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "memory_images", filter: `memory_id=eq.${YUNNAN_MEMORY_ROW_UUID}` },
          reload,
        )
        .subscribe();
    } catch {
      return () => {
        cancelled = true;
      };
    }
    return () => {
      cancelled = true;
      try {
        const sb = getSupabaseBrowser();
        if (channel) void sb.removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, [useCloud]);

  const sorted = useMemo(() => [...items].sort((a, b) => b.addedAt - a.addedAt), [items]);

  const selected = useMemo(() => items.find((g) => g.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => {
    if (!selected) return;
    queueMicrotask(() => {
      setDraftCaption(selected.caption);
      setDraftTs(selected.meta.timestamp);
      setDraftMood(selected.meta.mood);
      setDraftLoc(selected.meta.location);
      const eff = resolveMemoryDumpAuthor(selected);
      setDraftAuthorName(selected.author?.name?.trim() || eff.name);
      setDraftAuthorAvatar(selected.author?.avatar?.trim() ?? "");
    });
  }, [selected]);

  const clearZoom = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    queueMicrotask(() => clearZoom());
  }, [homeVersion, clearZoom]);

  useEffect(() => {
    const onHome = () => clearZoom();
    window.addEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
    return () => window.removeEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
  }, [clearZoom]);

  const openFilePicker = () => {
    setAddErr(null);
    if (galleryUploading) return;
    if (needsIdentityOnboarding()) {
      setIdentityOpen(true);
      return;
    }
    fileRef.current?.click();
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setAddErr(null);
    const identity = loadPersistedIdentity();
    if (!identity) {
      setAddErr("请先完成昵称设置。");
      setIdentityOpen(true);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const author: GalleryAuthor = { name: identity.displayName, avatar: identity.avatarUrl };

    if (useCloud) {
      const list = Array.from(files);
      const picked = list.filter((f) => fileAcceptsAsQuestPhoto(f) || fileAcceptsAsQuestVideo(f));
      if (picked.length === 0) {
        setAddErr(
          "没有识别为可上传的图片或视频。若为 iPhone 照片，请试「存储为 JPEG」后再选，或确认文件名含 .jpg / .heic 等扩展名。",
        );
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      setGalleryUploading(true);
      try {
        for (const file of picked) {
          if (items.length >= galleryCap) {
            setAddErr(`相册已满（${galleryCap}）。请先删除一些碎片。`);
            break;
          }
          const caption = file.name.replace(/\.[^/.]+$/, "") || "未命名";
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, "0");
          const day = String(now.getDate()).padStart(2, "0");
          const meta = { timestamp: `${y}.${m}.${day}`, mood: "—", location: "—" };
          try {
            await uploadCloudFragment({ file, caption, author, meta });
            const fresh = await fetchCloudGallery();
            setItems(fresh.slice(0, galleryCap));
          } catch (e) {
            console.error("[MemoryDumpAlbum] upload", e);
            setAddErr(e instanceof Error ? e.message : "上传失败");
            break;
          }
        }
      } finally {
        setGalleryUploading(false);
      }
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setAddErr(
      "Configure Supabase (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY, or NEXT_PUBLIC_MEMORY_GALLERY_CLOUD=1) so the gallery syncs for everyone.",
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const onRemove = async (id: string) => {
    if (useCloud) {
      try {
        await deleteCloudFragment(id);
      } catch (e) {
        setAddErr(e instanceof Error ? e.message : "删除失败");
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
    } else {
      setAddErr("Configure Supabase to delete gallery items.");
    }
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const onSaveDetail = async () => {
    if (!selectedId || !selected) return;
    const author: GalleryAuthor = {
      name: draftAuthorName.trim() || resolveMemoryDumpAuthor(selected).name,
      avatar: draftAuthorAvatar.trim() || undefined,
    };
    saveMemoryDumpUploaderProfile(author);
    if (useCloud) {
      try {
        await patchCloudFragment(selectedId, {
          caption: draftCaption,
          meta: { timestamp: draftTs, mood: draftMood, location: draftLoc },
          author,
        });
      } catch (e) {
        setAddErr(e instanceof Error ? e.message : "保存失败");
        return;
      }
      setItems((prev) =>
        prev.map((x) =>
          x.id === selectedId
            ? {
                ...x,
                caption: draftCaption,
                meta: { timestamp: draftTs, mood: draftMood, location: draftLoc },
                author,
              }
            : x,
        ),
      );
      return;
    }
    setAddErr("Configure Supabase to save gallery edits.");
  };

  return (
    <LayoutGroup id="memory-dump-root">
      <div className="relative h-full min-h-[100dvh] w-full overflow-x-hidden text-[#f4f0ff]">
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.48]">
          <MemoryTideBackground showSpotlight baseLayerMix={0.48} />
        </div>

        <div className="relative z-[2] flex min-h-[100dvh] flex-col">
          <header className="pointer-events-none shrink-0 px-4 pb-4 pt-7 text-center sm:px-8 sm:pb-5 sm:pt-9">
            <motion.h1
              className="font-display font-extralight uppercase text-white/[0.72] sm:font-thin"
              style={{
                fontSize: "clamp(1.375rem, 3.6vw, 1.875rem)",
                letterSpacing: "clamp(0.12em, 0.22vw, 0.2em)",
                lineHeight: 1.2,
                textShadow:
                  "0 0 28px rgba(255,255,255,0.14), 0 0 56px rgba(200,215,255,0.1), 0 0 80px rgba(160,190,255,0.06), 0 2px 18px rgba(8,10,24,0.35)",
              }}
              initial={{ opacity: 0.7, y: 8 }}
              animate={{
                opacity: [0.74, 0.82, 0.76, 0.8, 0.74],
                y: [0, -3, 1, -2, 0],
                scale: [1, 1.008, 1.004, 1.006, 1],
              }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            >
              MEMORY DUMP
            </motion.h1>
            <motion.p
              className="mx-auto mt-2 block font-sans text-[clamp(0.8125rem,2.1vw,0.9375rem)] font-extralight lowercase leading-snug tracking-[0.06em] text-white/60 sm:mt-2.5"
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.56, 0.62, 0.56],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              us again
            </motion.p>
          </header>

          <div className="pointer-events-auto relative z-[3] mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-center gap-2 px-4 pb-2 sm:px-6">
            <input
              ref={fileRef}
              type="file"
              accept={useCloud ? "image/*,video/*" : "image/*"}
              multiple
              className="sr-only"
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <motion.button
              type="button"
              disabled={galleryUploading}
              onClick={openFilePicker}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 shadow-[0_0_24px_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:border-white/35 hover:bg-white/[0.14] disabled:pointer-events-none disabled:opacity-45"
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            >
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
              <span className="text-sm normal-case tracking-normal">
                {galleryUploading ? "上传中…" : "添加照片"}
              </span>
            </motion.button>
            {hydrated && items.length > 0 && (
              <span className="text-[10px] text-violet-200/45">
                {items.length}/{galleryCap} {useCloud ? "云端" : "已存本地"}
              </span>
            )}
          </div>
          {addErr && (
            <p className="relative z-[3] mx-auto max-w-lg px-4 text-center text-[11px] text-amber-200/85" role="alert">
              {addErr}
            </p>
          )}

          <div className="relative z-[2] mx-auto min-h-[calc(100dvh-11rem)] w-full max-w-[1600px] flex-1 overflow-visible px-2 pb-32 pt-2 sm:px-4">
            {hydrated && sorted.length === 0 && (
              <motion.div
                className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-2xl border border-dashed border-white/18 bg-white/[0.04] px-6 py-12 text-center backdrop-blur-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: [0, -2.5, 1, -2, 0],
                  scale: [1, 1.004, 1, 1.003, 1],
                }}
                transition={{
                  opacity: { duration: 0.85, ease: [0.25, 0.55, 0.25, 1] },
                  y: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
                  scale: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
                }}
              >
                <p className="text-sm text-violet-100/75">相册还是空的</p>
                <p className="mt-2 text-xs leading-relaxed text-violet-200/45">
                  {useCloud
                    ? "点「添加照片」上传图片或视频；首次会请你留一个昵称，之后本浏览器会自动沿用。"
                    : "点「添加照片」从本机选图，会保存在浏览器本地（换设备不会同步）。"}
                </p>
              </motion.div>
            )}

            {sorted.map((item, index) => {
              if (selectedId === item.id) return null;
              const s = scatterFor(item.id, index);
              return (
                <MemoryDumpFragmentTile
                  key={item.id}
                  item={item}
                  index={index}
                  s={s}
                  hoverId={hoverId}
                  setHoverId={setHoverId}
                  setSelectedId={setSelectedId}
                  onRemove={onRemove}
                />
              );
            })}
          </div>

          {onOpenPortals && (
            <motion.button
              type="button"
              onClick={onOpenPortals}
              className="pointer-events-auto fixed bottom-6 left-1/2 z-[40] -translate-x-1/2 rounded-full border border-white/18 bg-white/[0.08] px-5 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100/90 shadow-[0_0_30px_rgba(120,100,200,0.2)] backdrop-blur-md transition hover:border-violet-300/35 hover:bg-white/[0.12]"
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: [1, 1.012, 1, 1.008, 1],
              }}
              transition={{
                opacity: { delay: 0.35, duration: 0.55 },
                y: { delay: 0.35, duration: 0.55 },
                scale: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
              }}
              whileTap={{ scale: 0.985 }}
            >
              Trace · Wish
            </motion.button>
          )}

          <AnimatePresence>
            {selectedId && selected && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close"
                  className="fixed inset-0 z-[160] bg-black/78 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  onClick={clearZoom}
                />
                <div className="fixed inset-0 z-[165] flex items-center justify-center overflow-y-auto p-6 sm:p-10">
                  <motion.div
                    layoutId={`memory-dump-${selected.id}`}
                    className="memory-tide-eternal-panel relative my-auto w-[min(92vw,720px)] max-w-full overflow-hidden rounded-2xl border-0 p-0 shadow-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative aspect-video w-full max-h-[min(62dvh,480px)] min-h-[200px] bg-black/50">
                      <MemoryFragmentMedia
                        item={{
                          src: selected.src,
                          caption: selected.caption,
                          mediaType: selected.mediaType ?? "image",
                        }}
                        variant="detail"
                        sizes="(max-width: 768px) 92vw, 720px"
                        priority
                      />
                    </div>
                    <div className="border-t border-white/10 px-5 py-4">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">标题</label>
                      <input
                        value={draftCaption}
                        onChange={(e) => setDraftCaption(e.target.value)}
                        className="mt-1 w-full border-b border-white/15 bg-transparent py-1.5 text-sm text-white/90 outline-none placeholder:text-white/25"
                      />
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">上传者</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-[10px] text-white/40">昵称</span>
                          <input
                            value={draftAuthorName}
                            onChange={(e) => setDraftAuthorName(e.target.value)}
                            placeholder="例如：小夜星"
                            className="mt-1 w-full border-b border-white/15 bg-transparent py-1 text-sm text-white/88 outline-none placeholder:text-white/22"
                          />
                        </label>
                        <label className="block sm:col-span-1">
                          <span className="text-[10px] text-white/40">头像链接（可选）</span>
                          <input
                            value={draftAuthorAvatar}
                            onChange={(e) => setDraftAuthorAvatar(e.target.value)}
                            placeholder="https://…"
                            className="mt-1 w-full border-b border-white/15 bg-transparent py-1 text-xs text-white/80 outline-none placeholder:text-white/22"
                          />
                        </label>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-violet-200/40">
                        新上传的照片会沿用这里的昵称；旧碎片没写名字时，会用萌萌的随机代号。
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <label className="block sm:col-span-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Timestamp</span>
                          <input
                            value={draftTs}
                            onChange={(e) => setDraftTs(e.target.value)}
                            className="mt-1 w-full border-b border-white/15 bg-transparent py-1 text-xs text-white/85 outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Mood</span>
                          <input
                            value={draftMood}
                            onChange={(e) => setDraftMood(e.target.value)}
                            className="mt-1 w-full border-b border-white/15 bg-transparent py-1 text-xs text-white/85 outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Location</span>
                          <input
                            value={draftLoc}
                            onChange={(e) => setDraftLoc(e.target.value)}
                            className="mt-1 w-full border-b border-white/15 bg-transparent py-1 text-xs text-white/85 outline-none"
                          />
                        </label>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={onSaveDetail}
                          className="memory-tide-eternal-pearl-btn"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRemove(selected.id);
                            clearZoom();
                          }}
                          className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-rose-200/80 transition hover:border-rose-300/35 hover:bg-rose-950/25"
                        >
                          删除
                        </button>
                        <button
                          type="button"
                          className="text-[11px] font-medium uppercase tracking-widest text-white/50 underline decoration-dotted underline-offset-4 hover:text-white/80"
                          onClick={clearZoom}
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <IdentityOnboardingModal
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        onComplete={() => {
          queueMicrotask(() => fileRef.current?.click());
        }}
      />
    </LayoutGroup>
  );
}
