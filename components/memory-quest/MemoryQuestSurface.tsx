"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, LayoutGrid, Link2, MapPin, Mic, Save, Sparkles, Square, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoryDumpAuthorBadge } from "@/components/home/MemoryDumpAuthorBadge";
import { MemoryTideGlobe, type MemoryTideGlobeHandle } from "@/components/globe/MemoryTideGlobe";
import { AscendingStar } from "@/components/wish/AscendingStar";
import { CloudWhisperStar } from "@/components/wish/CloudWhisperStar";
import { JellyCloudWishBackdrop } from "@/components/wish/JellyCloudWishBackdrop";
import { JellyCloudCard } from "@/components/memory-tide/JellyCloudCard";
import { MemoryTidePageShell } from "@/components/memory-tide/MemoryTidePageShell";
import { WhisperPlayer } from "@/components/whisper/WhisperPlayer";
import { useCelestial } from "@/contexts/CelestialContext";
import { formatLatLng } from "@/lib/format-coords";
import { dispatchMarkSuccess } from "@/lib/memory-tide-events";
import { parseManualLatLng } from "@/lib/parse-manual-coords";
import { nearestWishCloudAnchor } from "@/lib/wish-cloud-stars";
import { useWorldMemory } from "@/contexts/WorldMemoryContext";
import {
  createEchoOnServer,
  createWishOnServer,
  deleteEchoOnServer,
  deleteWishOnServer,
  patchEchoOnServer,
  patchWishOnServer,
  uploadWorldMedia,
} from "@/lib/world-memory-client";
import type { EchoFootprint } from "@/lib/echo-footprints";
import {
  resolveGalleryAuthor,
  saveMemoryDumpUploaderProfile,
  type GalleryAuthor,
} from "@/lib/memory-dump-storage";
import type { VisionDream } from "@/lib/vision-dreams";
import { maxGalleryItemsClient } from "@/lib/gallery-limits";
import { isCloudGalleryClient } from "@/lib/gallery-cloud-config";
import { loadPersistedIdentity } from "@/lib/user-identity";

type Variant = "trace" | "wish";
type SlotId = "media" | "voice" | "timeline" | "portal";

function glassIconBtn(active: boolean, filled: boolean, extra?: string) {
  return [
    "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-white/[0.05] backdrop-blur-md transition",
    active ? "ring-1 ring-violet-300/55 bg-white/[0.1]" : "",
    filled ? "shadow-[0_0_20px_rgba(190,170,255,0.42)] border-violet-300/40" : "",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function MemoryQuestSurface({ variant }: { variant: Variant }) {
  const galleryCap = maxGalleryItemsClient();
  const { isFullMoon } = useCelestial();
  const isTrace = variant === "trace";
  const { snapshot, refresh } = useWorldMemory();
  const rowsEcho = snapshot?.echoes ?? [];
  const rowsWish = snapshot?.wishes ?? [];
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [markPulseKey, setMarkPulseKey] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [draftGallery, setDraftGallery] = useState<string[]>([]);
  const [draftVoiceUrl, setDraftVoiceUrl] = useState("");
  const [draftRecordedDate, setDraftRecordedDate] = useState("");
  const [draftLinkUrl, setDraftLinkUrl] = useState("");
  const [draftDiary, setDraftDiary] = useState("");
  const [draftAuthorName, setDraftAuthorName] = useState("");
  const [draftAuthorAvatar, setDraftAuthorAvatar] = useState("");
  const [galleryErr, setGalleryErr] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const globeRef = useRef<MemoryTideGlobeHandle | null>(null);
  const [ritualPulseId, setRitualPulseId] = useState<string | null>(null);
  const [ascending, setAscending] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    cloudIndex: number;
  } | null>(null);
  const [rippleCloudIndex, setRippleCloudIndex] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const markers = useMemo(() => {
    if (isTrace) return rowsEcho.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, label: r.query }));
    return rowsWish.filter((r) => !r.isRealized).map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, label: r.query }));
  }, [isTrace, rowsEcho, rowsWish]);

  const realizedWishes = useMemo(
    () => (!isTrace ? rowsWish.filter((r) => r.isRealized) : []),
    [isTrace, rowsWish],
  );

  const selectedEcho = useMemo(() => rowsEcho.find((r) => r.id === selectedId) ?? null, [rowsEcho, selectedId]);
  const selectedWish = useMemo(() => rowsWish.find((r) => r.id === selectedId) ?? null, [rowsWish, selectedId]);
  const selected = isTrace ? selectedEcho : selectedWish;

  useEffect(() => {
    if (!selectedId || !selected) return;
    setDraftGallery([...selected.gallery]);
    setDraftVoiceUrl(selected.voiceNoteUrl || selected.audioUrl);
    setDraftRecordedDate(selected.recordedDate);
    setDraftLinkUrl(selected.linkUrl);
    setDraftDiary(!isTrace ? (selected as VisionDream).diary : "");
    const eff = resolveGalleryAuthor(selected);
    setDraftAuthorName(selected.author?.name?.trim() || eff.name);
    setDraftAuthorAvatar(selected.author?.avatar?.trim() ?? "");
    setGalleryErr(null);
    setSaveErr(null);
    setActiveSlot(null);
  }, [selectedId, selected, isTrace]);

  const onAdd = useCallback(async () => {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const manual = parseManualLatLng(q);
      let lat: number;
      let lng: number;
      let displayName: string;

      if (manual) {
        lat = manual.lat;
        lng = manual.lng;
        displayName = `${formatLatLng(lat, lng)} · manual pin`;
      } else {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const text = await res.text();
        let data: { lat?: number; lng?: number; displayName?: string; error?: string };
        try {
          data = JSON.parse(text) as typeof data;
        } catch {
          setError("Could not read geocoder response. Paste coordinates: lat, lng");
          return;
        }
        if (!res.ok) {
          setError(
            data.error ??
              "Place not found. Try another spelling or paste coordinates (e.g. 35.68, 139.76).",
          );
          return;
        }
        if (typeof data.lat !== "number" || typeof data.lng !== "number") {
          setError("Unexpected response. Try lat, lng.");
          return;
        }
        lat = data.lat;
        lng = data.lng;
        displayName = data.displayName ?? q;
      }

      const author =
        identity?.displayName.trim() ?
          { name: identity.displayName.trim(), avatar: identity.avatarUrl?.trim() || undefined }
        : undefined;

      if (isTrace) {
        const created = await createEchoOnServer({
          query: manual ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : q,
          displayName,
          lat,
          lng,
          ...(author ? { author } : {}),
        });
        if (!created) {
          setError("Could not save echo to the cloud.");
          return;
        }
        await refresh();
        setSelectedId(created.id);
        setDetailOpen(false);
        setMarkPulseKey(Date.now());
        dispatchMarkSuccess();
      } else {
        const created = await createWishOnServer({
          query: manual ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : q,
          displayName,
          lat,
          lng,
          ...(author ? { author } : {}),
        });
        if (!created) {
          setError("Could not save wish to the cloud.");
          return;
        }
        await refresh();
        setSelectedId(created.id);
        setDetailOpen(false);
        setMarkPulseKey(Date.now());
        dispatchMarkSuccess();
      }
      setQuery("");
    } catch {
      setError("Network error — try decimal coordinates (lat, lng) offline-style.");
    } finally {
      setBusy(false);
    }
  }, [busy, query, isTrace, refresh]);

  const onRemove = useCallback(
    async (id: string) => {
      if (isTrace) {
        await deleteEchoOnServer(id);
      } else {
        await deleteWishOnServer(id);
      }
      await refresh();
      setSelectedId((cur) => (cur === id ? null : cur));
      setDetailOpen(false);
    },
    [isTrace, refresh],
  );

  const removeSelectedMark = useCallback(() => {
    if (!selectedId) return;
    const row = isTrace ? rowsEcho.find((r) => r.id === selectedId) : rowsWish.find((r) => r.id === selectedId);
    const label = row?.query ?? "this mark";
    if (typeof window !== "undefined" && !window.confirm(`Remove “${label}” from the globe? This cannot be undone.`)) return;
    onRemove(selectedId);
    setDetailOpen(false);
  }, [selectedId, isTrace, rowsEcho, rowsWish, onRemove]);

  const handleReachClouds = useCallback(() => {
    if (!selectedId || isTrace) return;
    const w = rowsWish.find((r) => r.id === selectedId);
    if (!w || w.isRealized) return;
    setRitualPulseId(selectedId);
    window.setTimeout(() => {
      const pos = globeRef.current?.projectMarkerToScreen(selectedId);
      const vw = typeof window !== "undefined" ? window.innerWidth : 0;
      const vh = typeof window !== "undefined" ? window.innerHeight : 0;
      const start = pos ?? { x: vw * 0.5, y: vh * 0.52 };
      const anchor = nearestWishCloudAnchor(start, vw, vh);
      setRitualPulseId(null);
      setAscending({ start, end: { x: anchor.x, y: anchor.y }, cloudIndex: anchor.index });
      void (async () => {
        const ok = await patchWishOnServer(selectedId, { isRealized: true });
        if (ok) await refresh();
      })();
      setDetailOpen(false);
      setSelectedId(null);
    }, 520);
  }, [selectedId, isTrace, rowsWish, refresh]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recordChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) recordChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: rec.mimeType });
        void (async () => {
          const ext = rec.mimeType.includes("mp4") ? "m4a" : "webm";
          const file = new File([blob], `whisper.${ext}`, { type: rec.mimeType });
          const url = await uploadWorldMedia(file);
          if (url) setDraftVoiceUrl(url);
          else setGalleryErr("Could not save voice note (file too large for local mode or read failed).");
        })();
      };
      mediaRecorderRef.current = rec;
      rec.start(200);
      setIsRecording(true);
    } catch {
      setGalleryErr("Microphone not available.");
    }
  }, []);

  const onPickGallery = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setGalleryErr(null);
      const next = [...draftGallery];
      for (const file of Array.from(files)) {
        if (next.length >= galleryCap) {
          setGalleryErr(`Up to ${galleryCap} items in the gallery.`);
          break;
        }
        if (!file.type.startsWith("image/")) {
          setGalleryErr("Gallery accepts images only.");
          continue;
        }
        const url = await uploadWorldMedia(file);
        if (!url) {
          setGalleryErr("Upload failed for one or more images.");
          continue;
        }
        next.push(url);
      }
      setDraftGallery(next);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    },
    [draftGallery, galleryCap],
  );

  const onPickAudioFile = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setGalleryErr(null);
    const url = await uploadWorldMedia(file);
    if (url) setDraftVoiceUrl(url);
    else setGalleryErr("Audio upload failed.");
    if (audioFileRef.current) audioFileRef.current.value = "";
  }, []);

  const onSaveDetail = useCallback(async () => {
    if (!selectedId || !selected) return;
    setSaveErr(null);
    const author: GalleryAuthor = {
      name: draftAuthorName.trim() || resolveGalleryAuthor(selected).name,
      avatar: draftAuthorAvatar.trim() || undefined,
    };
    saveMemoryDumpUploaderProfile(author);
    if (isTrace) {
      if (!draftRecordedDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draftRecordedDate.trim())) {
        setSaveErr("Trace requires a valid timeline date (YYYY-MM-DD).");
        return;
      }
      const row = rowsEcho.find((r) => r.id === selectedId);
      if (!row || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) {
        setSaveErr("Coordinates are required for Trace.");
        return;
      }
      const updated = await patchEchoOnServer(selectedId, {
        gallery: draftGallery,
        audioUrl: draftVoiceUrl,
        voiceNoteUrl: draftVoiceUrl,
        recordedDate: draftRecordedDate.trim().slice(0, 10),
        linkUrl: draftLinkUrl.trim(),
        author,
      });
      if (!updated) {
        setSaveErr("Could not save to the cloud.");
        return;
      }
      await refresh();
      return;
    }
    if (!draftDiary.trim() && !draftLinkUrl.trim()) {
      setSaveErr("Wish needs your diary and/or a portal link.");
      return;
    }
    const updated = await patchWishOnServer(selectedId, {
      gallery: draftGallery,
      audioUrl: draftVoiceUrl,
      voiceNoteUrl: draftVoiceUrl,
      recordedDate: draftRecordedDate.trim().slice(0, 10) || new Date().toISOString().slice(0, 10),
      linkUrl: draftLinkUrl.trim(),
      diary: draftDiary,
      author,
    });
    if (!updated) {
      setSaveErr("Could not save to the cloud.");
      return;
    }
    await refresh();
  }, [
    selectedId,
    selected,
    isTrace,
    draftGallery,
    draftVoiceUrl,
    draftRecordedDate,
    draftLinkUrl,
    draftDiary,
    draftAuthorName,
    draftAuthorAvatar,
    rowsEcho,
    rowsWish,
    refresh,
  ]);

  const toggleSlot = (id: SlotId) => {
    setActiveSlot((cur) => (cur === id ? null : id));
    setGalleryErr(null);
  };

  const slotFilled = {
    media: draftGallery.length > 0,
    voice: Boolean(draftVoiceUrl?.trim()),
    timeline: Boolean(draftRecordedDate?.trim()),
    portal: Boolean(draftLinkUrl?.trim()),
  };

  const label = isTrace ? "Trace" : "Wish";
  const rows = isTrace ? rowsEcho : rowsWish;

  return (
    <MemoryTidePageShell>
      {!isTrace && (
        <>
          <JellyCloudWishBackdrop
            rippleCloudIndex={rippleCloudIndex}
            onRippleComplete={() => setRippleCloudIndex(null)}
          >
            {realizedWishes.map((w) => (
              <CloudWhisperStar key={w.id} wish={w} />
            ))}
          </JellyCloudWishBackdrop>
          {ascending && (
            <AscendingStar
              start={ascending.start}
              end={ascending.end}
              onComplete={() => {
                setRippleCloudIndex(ascending.cloudIndex);
                setAscending(null);
              }}
            />
          )}
        </>
      )}
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="shrink-0 flex flex-col items-center gap-2 pb-2">
          <p className="text-center font-display text-[10px] font-semibold uppercase tracking-[0.5em] text-violet-300/45">{label}</p>
        </div>

        {/* Mark controls above the globe so they stay visible without scrolling past the canvas */}
        <div className="relative z-20 shrink-0 px-1 pb-3 pt-0">
          <AnimatePresence>
            {markPulseKey !== null && (
              <motion.div
                key={markPulseKey}
                className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-r from-violet-400/25 via-fuchsia-400/20 to-amber-300/20 shadow-[0_0_32px_rgba(180,160,255,0.35)]"
                initial={{ opacity: 0.85, scale: 0.96 }}
                animate={{ opacity: 0, scale: 1.03 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => setMarkPulseKey(null)}
              />
            )}
          </AnimatePresence>
          <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onAdd();
                }
              }}
              placeholder={
                isTrace
                  ? "Place name (multi-engine lookup) or coordinates — e.g. Tokyo, 云南, 35.68, 139.76"
                  : "Place name or lat, lng — coordinates always work"
              }
              autoComplete="off"
              className="min-h-[48px] flex-1 rounded-xl border border-violet-400/20 bg-white/[0.04] px-3 py-2 text-sm text-[#f4f0ff] outline-none backdrop-blur-sm transition placeholder:text-violet-500/45 focus:border-violet-300/45 focus:bg-white/[0.06]"
            />
            <motion.button
              type="button"
              disabled={busy || !query.trim()}
              onClick={() => void onAdd()}
              className="inline-flex min-h-[48px] shrink-0 cursor-pointer items-center justify-center gap-2 self-stretch rounded-xl border border-violet-400/35 bg-white/[0.07] px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-50 shadow-[0_0_20px_rgba(140,120,220,0.15)] transition hover:border-violet-300/55 hover:bg-white/[0.1] disabled:pointer-events-none disabled:opacity-40 sm:self-auto"
              whileTap={{ scale: 0.98 }}
            >
              <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {busy ? "…" : "Mark"}
            </motion.button>
          </div>
          <p className="mx-auto mt-2 max-w-md text-center text-[10px] leading-relaxed text-violet-400/55">
            Uses Open-Meteo, Photon, then OpenStreetMap — no manual city list. Wrong spelling may still miss; use coordinates.
          </p>
          {!isCloudGalleryClient() && (
            <p className="mx-auto mt-2 max-w-md text-center text-[10px] leading-relaxed text-amber-200/70">
              未配置 Supabase：标点与附件暂存在本机浏览器（换设备或清缓存会丢）。配置 NEXT_PUBLIC_SUPABASE_URL 与 ANON_KEY 后可云端同步。
            </p>
          )}
          {error && (
            <p className="mx-auto mt-3 max-w-md text-center text-xs text-rose-300/90" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="relative z-10 flex min-h-[42dvh] flex-1 w-full items-center justify-center px-1 pb-2 pt-0 sm:min-h-[48dvh]">
          <div
            className={`h-[min(62dvh,calc(100dvh-14rem))] w-full max-w-[min(96vw,960px)] overflow-visible [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full ${isFullMoon ? "full-moon-glow memory-tide-globe-full-moon" : ""}`}
          >
            <MemoryTideGlobe
              ref={globeRef}
              markers={markers}
              selectedId={selectedId}
              ritualPulseMarkerId={!isTrace ? ritualPulseId : null}
              fullMoon={isFullMoon}
              onSelectMarker={(id) => {
                setSelectedId(id);
                setDetailOpen(id !== null);
              }}
            />
          </div>
        </div>

        <div className="shrink-0 px-1 pb-8">
          {rows.length === 0 ? (
            <p className="text-center text-xs text-violet-400/55">No marks yet.</p>
          ) : (
            <>
              <p className="mx-auto mb-3 max-w-md text-center font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-400/50">
                Your marks
              </p>
              <p className="mx-auto mb-2 max-w-md text-center text-[10px] leading-relaxed text-violet-500/55">
                Wrong city? Tap <span className="text-violet-300/70">Remove</span> on the row, or delete inside the card after opening a pin.
              </p>
              <ul className="mx-auto max-w-md space-y-1">
                {(isTrace ? rowsEcho : rowsWish).map((fp) => (
                  <li key={fp.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5 text-left backdrop-blur-sm transition hover:bg-white/[0.05]">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => {
                    setSelectedId(fp.id);
                    setDetailOpen(true);
                  }}>
                      <span className="font-display text-sm font-medium text-[#fff8f8]/95">{fp.query}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-violet-400/65">
                        {!isTrace && (fp as VisionDream).isRealized ? "In the clouds · Dream achieved" : fp.displayName}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-950/20 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-rose-200/90 transition hover:border-rose-400/45 hover:bg-rose-950/35"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== "undefined" && !window.confirm(`Remove “${fp.query}”?`)) return;
                        onRemove(fp.id);
                      }}
                      aria-label={`Remove ${fp.query}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selected && selectedId && detailOpen && (
          <motion.div
            className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button type="button" aria-label="Close" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setDetailOpen(false)} />
            <motion.div
              className="relative z-10 w-full max-w-lg px-3 pb-8 pt-2 sm:px-4 sm:pb-6"
              initial={{ y: 36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <JellyCloudCard className="max-h-[min(88vh,780px)] overflow-y-auto border-white/12 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="memory-tide-page-title font-display text-xl font-bold text-[#fff8f5] sm:text-2xl">{selected.query}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-violet-400/75">{selected.displayName}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-2 text-violet-300/80 transition hover:text-white"
                    onClick={() => setDetailOpen(false)}
                  >
                    <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </button>
                </div>

                <div className="mt-5 flex justify-center">
                  <div className="inline-flex max-w-full flex-col items-center gap-1 rounded-full border border-violet-400/25 bg-violet-950/35 px-5 py-2.5 text-center font-mono text-[11px] leading-snug text-violet-50/95 shadow-[0_8px_28px_rgba(40,24,80,0.35)] backdrop-blur-md sm:flex-row sm:gap-4 sm:text-xs">
                    <span>
                      <span className="text-violet-400/70">lat</span> {selected.lat.toFixed(5)}°
                    </span>
                    <span className="hidden text-violet-500/40 sm:inline">·</span>
                    <span>
                      <span className="text-violet-400/70">lng</span> {selected.lng.toFixed(5)}°
                    </span>
                    <span className="hidden w-full text-[10px] text-violet-500/55 sm:block sm:w-auto sm:pl-2 sm:text-[11px]">
                      ({formatLatLng(selected.lat, selected.lng)})
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
                  <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/55">上传者</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-violet-400/55">
                    与首页 Memory Dump 共用本机默认昵称；保存后写入该点位，Gallery 缩略图右下角会显示头像。
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] text-violet-400/65">昵称</span>
                      <input
                        value={draftAuthorName}
                        onChange={(e) => {
                          setDraftAuthorName(e.target.value);
                          setSaveErr(null);
                        }}
                        placeholder="例如：小夜星"
                        className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-violet-50 outline-none backdrop-blur-sm placeholder:text-violet-500/35"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-violet-400/65">头像链接（可选）</span>
                      <input
                        value={draftAuthorAvatar}
                        onChange={(e) => {
                          setDraftAuthorAvatar(e.target.value);
                          setSaveErr(null);
                        }}
                        placeholder="https://…"
                        className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-xs text-violet-50 outline-none backdrop-blur-sm placeholder:text-violet-500/35"
                      />
                    </label>
                  </div>
                </div>

                {!isTrace && selectedWish && (
                  <div className="mt-5">
                    <label htmlFor="wish-diary" className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/55">
                      Diary
                    </label>
                    <textarea
                      id="wish-diary"
                      value={draftDiary}
                      onChange={(e) => {
                        setDraftDiary(e.target.value);
                        setSaveErr(null);
                      }}
                      rows={5}
                      placeholder="The heart of this wish — story, mood, fragments…"
                      className="mt-2 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-3 text-sm text-violet-50/95 outline-none backdrop-blur-sm placeholder:text-violet-500/40 focus:border-violet-400/35"
                    />
                    <div className="mt-6">
                      {selectedWish.isRealized ? (
                        <p className="text-center font-display text-xs italic leading-relaxed text-violet-200/75">
                          This wish lives in the clouds — a star forever in the jelly sky.
                        </p>
                      ) : (
                        <motion.button
                          type="button"
                          onClick={handleReachClouds}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200/40 bg-gradient-to-r from-violet-500/[0.18] via-fuchsia-500/[0.12] to-amber-200/[0.14] py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fff8f0] shadow-[0_0_28px_rgba(255,220,200,0.14)] backdrop-blur-sm transition hover:border-amber-200/55"
                          whileTap={{ scale: 0.99 }}
                        >
                          <Sparkles className="h-4 w-4 text-amber-200/90" strokeWidth={2} aria-hidden />
                          Reach the Clouds
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {activeSlot && (
                    <motion.div
                      key={activeSlot}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                    >
                      {activeSlot === "media" && (
                        <div>
                          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/55">Gallery</p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {draftGallery.map((src, idx) => (
                              <div key={`${idx}-${src.slice(0, 20)}`} className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                <Image src={src} alt="" fill className="object-cover" unoptimized />
                                {/* Shared attribution chip — see MemoryDumpAuthorBadge (layout + tooltip spec). */}
                                <MemoryDumpAuthorBadge
                                  author={resolveGalleryAuthor(selected)}
                                  itemId={selected.id}
                                  placement="thumb"
                                  size="sm"
                                />
                                <button
                                  type="button"
                                  className="absolute right-1 top-1 z-20 rounded bg-black/55 p-0.5 text-white"
                                  onClick={() => setDraftGallery((p) => p.filter((_, i) => i !== idx))}
                                  aria-label="Remove"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => onPickGallery(e.target.files)}
                          />
                          <button
                            type="button"
                            disabled={draftGallery.length >= galleryCap}
                            onClick={() => galleryInputRef.current?.click()}
                            className="mt-3 text-[11px] font-medium text-violet-200/80 underline decoration-dotted decoration-violet-400/40 underline-offset-4 disabled:opacity-35"
                          >
                            Add to gallery
                          </button>
                          {galleryErr && (
                            <p className="mt-2 text-[11px] text-rose-300/90" role="alert">
                              {galleryErr}
                            </p>
                          )}
                        </div>
                      )}
                      {activeSlot === "voice" && (
                        <div>
                          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/55">Voice</p>
                          {draftVoiceUrl ? (
                            <div className="mt-3">
                              <WhisperPlayer voiceNoteUrl={draftVoiceUrl} label="Your whisper" compact />
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-violet-400/60">No clip yet — record or upload.</p>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {!isRecording ? (
                              <button
                                type="button"
                                onClick={startRecording}
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-violet-100/90 backdrop-blur-sm"
                              >
                                <Mic className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                Record
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-300/35 bg-rose-950/30 px-3 py-2 text-[11px] font-medium text-rose-100/90"
                              >
                                <Square className="h-3.5 w-3.5 fill-current" strokeWidth={2} aria-hidden />
                                Stop
                              </button>
                            )}
                            <input
                              ref={audioFileRef}
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => onPickAudioFile(e.target.files)}
                            />
                            <button
                              type="button"
                              onClick={() => audioFileRef.current?.click()}
                              className="text-[11px] font-medium text-violet-200/80 underline decoration-dotted decoration-violet-400/40 underline-offset-4"
                            >
                              Upload audio
                            </button>
                            {draftVoiceUrl && (
                              <button
                                type="button"
                                onClick={() => setDraftVoiceUrl("")}
                                className="text-[11px] text-violet-500/70 hover:text-rose-300/90"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {activeSlot === "timeline" && (
                        <div>
                          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/55">Timeline</p>
                          <input
                            type="date"
                            value={draftRecordedDate.slice(0, 10)}
                            onChange={(e) => {
                              setDraftRecordedDate(e.target.value);
                              setSaveErr(null);
                            }}
                            className="mt-3 w-full max-w-[14rem] rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-violet-50 outline-none backdrop-blur-sm"
                          />
                          {isTrace && (
                            <p className="mt-2 text-[11px] text-violet-400/65">Trace saves require this date.</p>
                          )}
                        </div>
                      )}
                      {activeSlot === "portal" && (
                        <div>
                          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/55">Portal</p>
                          <input
                            type="url"
                            value={draftLinkUrl}
                            onChange={(e) => {
                              setDraftLinkUrl(e.target.value);
                              setSaveErr(null);
                            }}
                            placeholder="https://…"
                            className="mt-3 w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-violet-50 outline-none backdrop-blur-sm placeholder:text-violet-500/40"
                          />
                          {!isTrace && (
                            <p className="mt-2 text-[11px] text-violet-400/65">Maps, social, articles — central to Wish.</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 grid w-full grid-cols-4 gap-3 sm:gap-4">
                  <button
                    type="button"
                    aria-label="Media gallery"
                    aria-pressed={activeSlot === "media"}
                    onClick={() => toggleSlot("media")}
                    className={glassIconBtn(activeSlot === "media", slotFilled.media, "mx-auto")}
                  >
                    <LayoutGrid className="h-[18px] w-[18px] text-violet-100/90" strokeWidth={1.85} />
                  </button>
                  <button
                    type="button"
                    aria-label="Voice"
                    aria-pressed={activeSlot === "voice"}
                    onClick={() => toggleSlot("voice")}
                    className={glassIconBtn(activeSlot === "voice", slotFilled.voice, "mx-auto")}
                  >
                    <Mic className="h-[18px] w-[18px] text-violet-100/90" strokeWidth={1.85} />
                  </button>
                  <button
                    type="button"
                    aria-label="Timeline date"
                    aria-pressed={activeSlot === "timeline"}
                    onClick={() => toggleSlot("timeline")}
                    className={glassIconBtn(activeSlot === "timeline", slotFilled.timeline, "mx-auto")}
                  >
                    <Calendar className="h-[18px] w-[18px] text-violet-100/90" strokeWidth={1.85} />
                  </button>
                  <button
                    type="button"
                    aria-label="Portal link"
                    aria-pressed={activeSlot === "portal"}
                    onClick={() => toggleSlot("portal")}
                    className={glassIconBtn(activeSlot === "portal", slotFilled.portal, "mx-auto")}
                  >
                    <Link2 className="h-[18px] w-[18px] text-violet-100/90" strokeWidth={1.85} />
                  </button>
                </div>

                {saveErr && (
                  <p className="mt-4 text-center text-xs text-rose-300/90" role="alert">
                    {saveErr}
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <motion.button
                    type="button"
                    onClick={removeSelectedMark}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-400/35 bg-rose-950/25 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100/90 backdrop-blur-sm transition hover:border-rose-400/55 hover:bg-rose-950/40"
                    whileTap={{ scale: 0.99 }}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Remove mark
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={onSaveDetail}
                    className="flex flex-[1.35] items-center justify-center gap-2 rounded-2xl border border-violet-400/28 bg-white/[0.06] py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#fff8f0] backdrop-blur-sm transition hover:bg-white/[0.1]"
                    whileTap={{ scale: 0.99 }}
                  >
                    <Save className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Save
                  </motion.button>
                </div>
              </JellyCloudCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MemoryTidePageShell>
  );
}
