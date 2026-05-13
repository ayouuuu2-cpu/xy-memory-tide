"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, Image as ImageIcon, Link2, MapPin, Music, StickyNote, Star, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MemoryTideGlobe, type MemoryTideGlobeHandle } from "@/components/globe/MemoryTideGlobe";
import { IgniteCeremonyOverlay } from "@/components/memory-quest/IgniteCeremonyOverlay";
import { ScatteredPhotoGalleryOverlay } from "@/components/memory-quest/ScatteredPhotoGalleryOverlay";
import { ScrapbookPhotoCollage } from "@/components/memory-quest/ScrapbookPhotoCollage";
import { RorySidebarCompanion } from "@/components/memory-quest/RorySidebarCompanion";
import { MiniEnvelopeGlyph } from "@/components/memory-quest/RetroEnvelope";
import { StationeryNoteEditor } from "@/components/memory-quest/StationeryNoteEditor";
import { MemoryTidePageShell } from "@/components/memory-tide/MemoryTidePageShell";
import { useCelestial } from "@/contexts/CelestialContext";
import { useWorldMemory } from "@/contexts/WorldMemoryContext";
import type { EchoFootprint } from "@/lib/echo-footprints";
import type { MemoryObject } from "@/lib/memory-objects";
import { parseManualLatLng } from "@/lib/parse-manual-coords";
import { fileAcceptsAsQuestPhoto, fileAcceptsAsQuestVideo } from "@/lib/quest-media-accept";
import { isMemoryResonanceDate } from "@/lib/memory-resonance-dates";
import { persistStarAtlas, toStarAtlasEntry } from "@/lib/star-atlas-local";
import type { ScrapbookMediaItem } from "@/components/memory-quest/ScrapbookPhotoCollage";
import type { CelestialBirthdayMode } from "@/lib/celestial";
import type { QuestPhotoRecord, QuestVariant } from "@/lib/quest-photos";
import type { VisionDream } from "@/lib/vision-dreams";
import { MEMORY_TIDE_IDENTITY_CHANGE } from "@/lib/session-identity-store";
import { touchRoryActivity } from "@/lib/rory-activity";
import { loadPersistedIdentity } from "@/lib/user-identity";
import {
  createEchoOnServer,
  createWishOnServer,
  deleteEchoOnServer,
  deleteWishOnServer,
  deleteQuestPhotoClient,
  fetchQuestPhotosClient,
  insertQuestPhotoClientResult,
  patchEchoOnServer,
  patchWishOnServer,
  convertWishToTraceOnServer,
  uploadWorldMediaWithMetaResult,
} from "@/lib/world-memory-client";

type Variant = QuestVariant;
type ActiveMark = EchoFootprint | VisionDream;

function mergeGalleryUrls(photoRecords: QuestPhotoRecord[], objects: MemoryObject[]): string[] {
  const questUrls = photoRecords.map((p) => p.publicUrl);
  const memPhotoUrls = objects.filter((m) => m.type === "photo").map((m) => m.url);
  return [...new Set([...questUrls, ...memPhotoUrls])];
}

function isoNow() {
  return new Date().toISOString();
}

async function resolveLatLngForMark(q: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const manual = parseManualLatLng(q);
  if (manual) {
    return {
      lat: manual.lat,
      lng: manual.lng,
      displayName: `${manual.lat.toFixed(4)}, ${manual.lng.toFixed(4)}`,
    };
  }
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as { lat?: number; lng?: number; displayName?: string };
      if (typeof j.lat === "number" && typeof j.lng === "number" && Number.isFinite(j.lat) && Number.isFinite(j.lng)) {
        return {
          lat: j.lat,
          lng: j.lng,
          displayName: typeof j.displayName === "string" && j.displayName.trim() ? j.displayName.trim() : q,
        };
      }
    }
  } catch {
    /* geocode unavailable; fallback below */
  }
  return { lat: 25.04, lng: 102.72, displayName: q };
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatYmdSlash(ymd: string) {
  const raw = ymd.slice(0, 10);
  const parts = raw.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  return todayYmd().replace(/-/g, "/");
}

/** 稳定小角度，用于手记预览行轻微「写歪」感 */
function notePreviewTiltDeg(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return -0.55 + (h % 100) / 100;
}

/** 手记关键词 → 和纸胶带氛围（轻量装饰） */
function moodTapeVariant(noteTextJoined: string): "rain" | "sun" | null {
  const s = noteTextJoined.toLowerCase();
  if (/雨|rain|难过|伤心|sad|阴/.test(s)) return "rain";
  if (/晴|开心|happy|太阳|暖|光/.test(s)) return "sun";
  return null;
}

function MemoryShowcasePanel({
  variant,
  markId,
  placeName,
  placePhotos,
  items,
  saving,
  celestialBirthday,
  landedEnvelopeNoteId,
  igniteBusy,
  onClose,
  onRemoveMark,
  onOpenNote,
  onRemoveTextNote,
  onRemoveScrapbookItem,
  onIgniteToTrace,
}: {
  variant: Variant;
  markId: string;
  placeName: string;
  placePhotos: QuestPhotoRecord[];
  items: MemoryObject[];
  saving: boolean;
  celestialBirthday: CelestialBirthdayMode | null;
  landedEnvelopeNoteId: string | null;
  igniteBusy?: boolean;
  onClose: () => void;
  onRemoveMark: () => void;
  onOpenNote: (id: string, content: string) => void;
  onRemoveTextNote: (id: string) => void;
  onRemoveScrapbookItem: (item: ScrapbookMediaItem) => void;
  onIgniteToTrace?: () => void;
}) {
  const strandLabel = variant === "trace" ? "拾遗" : "未竟";
  const apiUrls = useMemo(() => new Set(placePhotos.map((p) => p.publicUrl)), [placePhotos]);
  const scrapbookItems = useMemo(() => {
    const fromApi = placePhotos.map((p) => ({
      id: p.id,
      url: p.publicUrl,
      caption: p.caption,
      mediaType: p.mediaType,
    }));
    const legacy = items
      .filter((m): m is Extract<MemoryObject, { type: "photo" }> => m.type === "photo" && !apiUrls.has(m.url))
      .map((m) => ({
        id: m.id,
        url: m.url,
        caption: typeof m.caption === "string" ? m.caption : "",
        mediaType: "image" as const,
      }));
    return [...fromApi, ...legacy];
  }, [placePhotos, items, apiUrls]);
  const nonPhotoItems = useMemo(() => items.filter((m) => m.type !== "photo"), [items]);
  const textNotes = useMemo(
    () => nonPhotoItems.filter((m): m is Extract<MemoryObject, { type: "text" }> => m.type === "text"),
    [nonPhotoItems],
  );
  const otherNonPhoto = useMemo(
    () => nonPhotoItems.filter((m) => m.type !== "text"),
    [nonPhotoItems],
  );
  const totalCount = scrapbookItems.length + nonPhotoItems.length;

  const moodTape = useMemo(
    () => moodTapeVariant(textNotes.map((n) => n.content).join(" ")),
    [textNotes],
  );

  const emptyHint =
    variant === "trace"
      ? "还没有拾遗片段；可用底部工具栏添加。"
      : "还没有未竟心愿片段；可用底部工具栏添加。";

  const [scatterOpen, setScatterOpen] = useState(false);
  const [scatterFocusId, setScatterFocusId] = useState<string | null>(null);
  const [scatterLayoutNonce, setScatterLayoutNonce] = useState(0);

  useEffect(() => {
    if (variant !== "trace") return;
    const reveal = sessionStorage.getItem("memory-tide-ignite-reveal");
    if (!reveal || reveal !== markId) return;
    sessionStorage.removeItem("memory-tide-ignite-reveal");
    if (scrapbookItems.length === 0) return;
    setScatterLayoutNonce((n) => n + 1);
    setScatterFocusId(scrapbookItems[0]!.id);
    setScatterOpen(true);
  }, [variant, markId, scrapbookItems]);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="memory-tide-handdrawn-panel relative flex max-h-[calc(100dvh-5.5rem)] w-full flex-col overflow-visible rounded-2xl border border-violet-200/18 bg-black/40 shadow-[0_12px_48px_rgba(10,6,28,0.45)] backdrop-blur-xl lg:max-h-[calc(100dvh-5.5rem)] lg:w-[min(420px,38vw)] lg:shrink-0"
    >
      <div data-note-envelope-fly-anchor className="pointer-events-none absolute right-8 top-[42%] h-px w-px opacity-0" aria-hidden />
      <RorySidebarCompanion />
      {celestialBirthday === "scorpio" ? (
        <div className="pointer-events-none absolute left-3 top-[5.5rem] z-[4] max-w-[min(18rem,85%)] sm:top-[6rem]">
          <div className="font-display rotate-[-2.5deg] rounded-lg border border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-950/70 to-violet-950/65 px-3 py-2 text-[12px] leading-snug text-fuchsia-50 shadow-[0_8px_22px_rgba(80,20,90,0.35)]">
            ✨ 今天的记忆，是送给 11.12 的一份珍贵礼物。
          </div>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3 border-b border-dashed border-white/15 px-4 py-3">
        <div>
          <p className="font-display text-lg text-violet-50">{placeName}</p>
          <p className="font-display mt-0.5 text-[14px] font-medium tracking-[0.28em] text-amber-100/92">{strandLabel}</p>
          <p className="font-serif mt-1 text-[12.5px] leading-snug tracking-[0.04em] text-violet-200/82">
            {variant === "trace" ? "已发生的实地记忆" : "未来的向往与攻略"}
          </p>
          <p className="font-display mt-0.5 text-[11px] tracking-[0.14em] text-violet-300/58">共 {totalCount} 件</p>
          {variant === "wish" && onIgniteToTrace ? (
            <button
              type="button"
              disabled={Boolean(igniteBusy) || saving}
              onClick={onIgniteToTrace}
              className="mt-3 w-full rounded-xl border border-violet-300/35 bg-violet-900/35 px-3 py-2.5 text-center font-serif text-[15px] text-violet-50 shadow-[0_8px_24px_rgba(30,12,50,0.4)] transition hover:border-violet-200/50 hover:bg-violet-800/35 disabled:opacity-45"
            >
              成真了哦～去拾遗
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/18 bg-white/5 px-2.5 py-1 text-sm text-violet-100/90"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {moodTape === "rain" ? (
          <div
            className="pointer-events-none mx-auto mb-1 h-5 w-[94%] max-w-sm rounded-sm opacity-80 shadow-sm"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgba(140,180,220,0.35) 0 10px, rgba(200,210,240,0.2) 10px 20px), linear-gradient(180deg, rgba(60,90,130,0.25), transparent)",
            }}
            aria-hidden
          />
        ) : moodTape === "sun" ? (
          <div
            className="pointer-events-none mx-auto mb-1 h-5 w-[94%] max-w-sm rounded-sm opacity-85 shadow-[0_0_16px_rgba(255,220,160,0.2)]"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,236,200,0.45), rgba(255,210,160,0.35), rgba(255,240,210,0.5))",
            }}
            aria-hidden
          />
        ) : null}
        {scrapbookItems.length > 0 ? (
          <ScrapbookPhotoCollage
            items={scrapbookItems}
            onRemoveItem={onRemoveScrapbookItem}
            onOpenScatter={(item) => {
              setScatterLayoutNonce((n) => n + 1);
              setScatterFocusId(item.id);
              setScatterOpen(true);
            }}
          />
        ) : null}

        {textNotes.length > 0 ? (
          <div className="space-y-3 border-t border-dashed border-amber-200/15 pt-4">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-violet-300/55">手记信封</p>
            <div className="flex flex-col gap-2.5">
              {textNotes.map((note) => {
                const preview = note.content.trim().replace(/\s+/g, " ").slice(0, 42);
                const landed = landedEnvelopeNoteId === note.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    data-note-envelope-slot={note.id}
                    onClick={() => onOpenNote(note.id, note.content)}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-lg border-2 border-[#6b4e2e]/55 bg-gradient-to-br from-[#2f1c14]/95 via-[#241610]/92 to-[#1a100c]/95 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,230,200,0.07),0_5px_0_rgba(12,6,4,0.42),0_12px_28px_rgba(0,0,0,0.38)] ring-1 ring-black/25 transition hover:border-amber-300/45 hover:shadow-[inset_0_1px_0_rgba(255,240,210,0.12),0_4px_0_rgba(12,6,4,0.38),0_14px_32px_rgba(40,20,10,0.35)] ${landed ? "stationery-envelope-just-landed ring-violet-400/35" : ""}`}
                  >
                    <button
                      type="button"
                      aria-label="移除此手记"
                      disabled={saving}
                      className="pointer-events-auto absolute bottom-2 left-2 z-[2] flex h-7 w-7 items-center justify-center rounded-full border border-rose-400/35 bg-rose-950/50 text-rose-100/90 opacity-0 shadow-md transition hover:bg-rose-900/55 group-hover:opacity-100 disabled:opacity-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTextNote(note.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                    <span className="pointer-events-none absolute right-3 top-2 rounded border border-rose-900/30 bg-rose-950/40 px-1.5 py-0.5 text-[9px] tracking-[0.18em] text-amber-100/75">
                      火漆封存
                    </span>
                    <div
                      className={`w-[3.75rem] shrink-0 transition ${landed ? "scale-110" : "scale-[0.98] group-hover:scale-100"}`}
                    >
                      <MiniEnvelopeGlyph className="pointer-events-none w-full drop-shadow-md" aria-hidden />
                    </div>
                    <div className={`min-w-0 flex-1 pr-14 ${landed ? "opacity-75" : ""}`}>
                      <p className="text-[10px] tracking-[0.16em] text-violet-300/60">轻触启封</p>
                      <p
                        className="mt-1 line-clamp-2 text-sm leading-snug text-[#f5e9d8]/92"
                        style={{ transform: `rotate(${notePreviewTiltDeg(note.id)}deg)` }}
                      >
                        {preview || "（空白手记）"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {otherNonPhoto.length > 0 ? (
          <div className="space-y-4 border-t border-dashed border-violet-300/15 pt-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-violet-300/45">其它片段</p>
            {otherNonPhoto.map((m) => {
              if (m.type === "video") {
                return (
                  <div key={m.id} className="overflow-hidden rounded-xl border border-white/12 bg-black/50 p-2">
                    <video src={m.url} poster={m.posterUrl} className="max-h-48 w-full rounded-lg object-cover" controls playsInline />
                    {m.caption ? <p className="mt-2 px-1 text-xs text-violet-200/75">{m.caption}</p> : null}
                  </div>
                );
              }
              if (m.type === "music") {
                return (
                  <div key={m.id} className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-3">
                    <p className="text-xs text-fuchsia-100/90">{m.title || "音乐"}</p>
                    <audio src={m.url} controls className="mt-2 w-full" />
                  </div>
                );
              }
              if (m.type === "link") {
                return (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-cyan-200/25 bg-cyan-500/5 px-3 py-2.5 text-sm text-cyan-100/95 underline-offset-2 hover:border-cyan-200/45"
                  >
                    {m.title || m.url}
                  </a>
                );
              }
              return null;
            })}
          </div>
        ) : null}

        {scrapbookItems.length === 0 && nonPhotoItems.length === 0 ? (
          <p className="text-sm leading-relaxed text-violet-200/55">{emptyHint}</p>
        ) : null}
      </div>
      {scatterOpen ? (
        <ScatteredPhotoGalleryOverlay
          items={scrapbookItems}
          initialFocusId={scatterFocusId}
          layoutNonce={scatterLayoutNonce}
          onClose={() => setScatterOpen(false)}
        />
      ) : null}

      <div className="border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onRemoveMark}
          disabled={saving}
          className="w-full rounded-xl border border-rose-400/30 bg-rose-500/10 py-2 text-xs text-rose-100/90 disabled:opacity-40"
        >
          移除此地标记
        </button>
      </div>
    </motion.aside>
  );
}

function DockActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[72px] min-w-0 flex-1 select-none flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/14 bg-white/[0.06] px-2 py-2 text-[11px] font-medium text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.09] active:scale-[0.985] active:bg-white/[0.12] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] disabled:pointer-events-none disabled:opacity-35"
    >
      <span className="flex h-8 w-8 items-center justify-center text-white/90 [&>svg]:h-[18px] [&>svg]:w-[18px]">{children}</span>
      <span className="truncate text-center leading-tight tracking-wide">{label}</span>
    </button>
  );
}

const REMOTE_HINT_DISMISS_KEY = "xy-memory-tide-dismiss-remote-hint";

export function MemoryQuestSurface({ variant }: { variant: Variant }) {
  const isTrace = variant === "trace";
  const { isFullMoon, celestialBirthday } = useCelestial();
  const { snapshot, refresh, worldMemoryRemote } = useWorldMemory();
  const rows = useMemo(
    () => (isTrace ? ((snapshot?.echoes ?? []) as ActiveMark[]) : ((snapshot?.wishes ?? []) as ActiveMark[])),
    [isTrace, snapshot],
  );
  /** 地图选中的地点（与手记仪式无关；点星不打开信封） */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placePhotos, setPlacePhotos] = useState<QuestPhotoRecord[]>([]);
  const [query, setQuery] = useState("");
  const [timeDraft, setTimeDraft] = useState(() => todayYmd());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 仅在尚无任一记忆星时：顶部按钮打开首次打点浮层 */
  const [firstMarkOpen, setFirstMarkOpen] = useState(false);
  /** Chevron 收起 dock；有选中星标时才可出现 dock */
  const [dockCollapsed, setDockCollapsed] = useState(false);
  /** 仅由 Dock「写信」或侧栏启封触发；内部再由 StationeryNoteEditor 拆分信封层 / 信纸层 */
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState("");
  const [noteInitialContent, setNoteInitialContent] = useState("");
  const [noteEntrance, setNoteEntrance] = useState<"compose" | "unwrap">("compose");
  const [sessionIdentity, setSessionIdentity] = useState<ReturnType<typeof loadPersistedIdentity>>(null);
  const [landedEnvelopeNoteId, setLandedEnvelopeNoteId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const globeRef = useRef<MemoryTideGlobeHandle | null>(null);
  const [igniteOpen, setIgniteOpen] = useState(false);
  const [igniteBusy, setIgniteBusy] = useState(false);
  const [ritualPulseMarkerId, setRitualPulseMarkerId] = useState<string | null>(null);
  /** 仅在 Dock「写信」/ 侧栏启封手记时递增，用于仪式组件干净挂载（与地图上选星无关）。 */
  const [noteRitualBootstrap, setNoteRitualBootstrap] = useState(0);
  const [remoteHintDismissed, setRemoteHintDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage.getItem(REMOTE_HINT_DISMISS_KEY) === "1") {
        setRemoteHintDismissed(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    touchRoryActivity();
    const refreshIdentity = () => setSessionIdentity(loadPersistedIdentity());
    refreshIdentity();
    window.addEventListener(MEMORY_TIDE_IDENTITY_CHANGE, refreshIdentity);
    return () => window.removeEventListener(MEMORY_TIDE_IDENTITY_CHANGE, refreshIdentity);
  }, []);

  useEffect(() => {
    const entries = rows
      .filter((r) => (isTrace ? true : !(r as VisionDream).isRealized))
      .map((r) =>
        toStarAtlasEntry(
          r.id,
          r.lat,
          r.lng,
          isTrace ? "trace" : "wish",
          r.recordedDate.slice(0, 10),
          r.query,
        ),
      );
    persistStarAtlas(entries);
  }, [rows, isTrace]);

  const dockVisible = Boolean(selectedId) && !dockCollapsed;

  const openFirstMarkSheet = useCallback(() => {
    setError(null);
    setFirstMarkOpen(true);
    queueMicrotask(() => queryInputRef.current?.focus());
  }, []);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);
  const sceneObjects = selected?.memoryObjects ?? [];

  useEffect(() => {
    if (!selectedId || !worldMemoryRemote) {
      queueMicrotask(() => setPlacePhotos([]));
      return;
    }
    let cancelled = false;
    void fetchQuestPhotosClient(selectedId, variant).then((list) => {
      if (!cancelled) setPlacePhotos(list);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, worldMemoryRemote, variant]);

  useEffect(() => {
    setLandedEnvelopeNoteId(null);
  }, [selectedId]);

  useEffect(() => {
    if (!landedEnvelopeNoteId) return;
    const t = window.setTimeout(() => setLandedEnvelopeNoteId(null), 2600);
    return () => window.clearTimeout(t);
  }, [landedEnvelopeNoteId]);

  const handleSelectMarker = useCallback((id: string | null) => {
    setSelectedId(id);
    setDockCollapsed(false);
  }, []);
  const markers = useMemo(
    () =>
      rows
        .filter((r) => (isTrace ? true : !(r as VisionDream).isRealized))
        .map((r) => ({
          id: r.id,
          lat: r.lat,
          lng: r.lng,
          label: r.displayName || r.query,
          kind: isTrace ? ("trace" as const) : ("wish" as const),
          resonance: isMemoryResonanceDate(r.recordedDate),
        })),
    [rows, isTrace],
  );

  const addMark = async () => {
    const q = query.trim();
    if (!q) {
      setError("请先输入地点名称，或 lat,lng 坐标（例如 25.04, 102.72）。");
      window.setTimeout(() => queryInputRef.current?.focus(), 0);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { lat, lng, displayName } = await resolveLatLngForMark(q);
      const identity = loadPersistedIdentity();
      const base = {
        query: q,
        displayName,
        lat,
        lng,
        author: identity?.displayName?.trim()
          ? {
              name: identity.displayName.trim(),
              avatar: identity.avatarUrl?.trim() || undefined,
            }
          : undefined,
      };
      const created = isTrace ? await createEchoOnServer(base) : await createWishOnServer({ ...base, diary: "", isRealized: false });
      if (!created) {
        setError(
          "仍无法保存。请在 Network 中查看 /api/world-echoes 或 /api/world-wishes 的返回；并确认 Supabase 已建表 world_echoes / world_wishes 且 RLS 允许写入。",
        );
        return;
      }
      await refresh();
      setSelectedId(created.id);
      setDockCollapsed(false);
      setFirstMarkOpen(false);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存异常，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  const patchSelected = async (objects: MemoryObject[]): Promise<boolean> => {
    const markId = selectedId;
    if (!markId) return false;
    const row = rows.find((r) => r.id === markId);
    if (!row) return false;
    setSaving(true);
    setError(null);
    try {
      const firstText = objects.find((m) => m.type === "text")?.content ?? "";
      const firstMusic = objects.find((m) => m.type === "music")?.url ?? "";
      const firstLink = objects.find((m) => m.type === "link")?.url ?? "";
      const gallery = mergeGalleryUrls(placePhotos, objects);
      const recordedDate = objects.find((m) => m.type === "music")?.recordedAt?.slice(0, 10) ?? row.recordedDate;

      const updated = isTrace
        ? await patchEchoOnServer(markId, {
            memoryObjects: objects,
            gallery,
            voiceNoteUrl: firstMusic,
            audioUrl: firstMusic,
            linkUrl: firstLink,
            recordedDate,
            author: sessionIdentity?.displayName?.trim()
              ? {
                  name: sessionIdentity.displayName.trim(),
                  avatar: sessionIdentity.avatarUrl?.trim() || undefined,
                }
              : undefined,
          })
        : await patchWishOnServer(markId, {
            memoryObjects: objects,
            gallery,
            voiceNoteUrl: firstMusic,
            audioUrl: firstMusic,
            linkUrl: firstLink,
            diary: firstText,
            recordedDate,
            author: sessionIdentity?.displayName?.trim()
              ? {
                  name: sessionIdentity.displayName.trim(),
                  avatar: sessionIdentity.avatarUrl?.trim() || undefined,
                }
              : undefined,
          });

      if (!updated) {
        setError(
          "保存失败：回忆未写入。若使用云端，请确认服务端已配置 Supabase Service Role，且与浏览器端的 Supabase 环境一致；仅一半配置会导致保存静默失败。",
        );
        return false;
      }
      await refresh();
      touchRoryActivity();
      return true;
    } catch {
      setError("保存异常，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onPickMedia = async (files: FileList | null, preferredType: "photo" | "video" | "music") => {
    if (!selected || !files?.length) return;

    if (preferredType === "music") {
      const next = [...sceneObjects];
      let uploaded = 0;
      for (const file of Array.from(files)) {
        const res = await uploadWorldMediaWithMetaResult(file);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        uploaded += 1;
        next.push({
          type: "music",
          id: `music-${Date.now()}-${Math.random()}`,
          createdAt: isoNow(),
          url: res.meta.url,
          recordedAt: timeDraft ? `${timeDraft}T12:00:00.000Z` : isoNow(),
        });
      }
      if (uploaded === 0) {
        setError("未选择有效音频文件。");
        return;
      }
      await patchSelected(next);
      return;
    }

    const identity = loadPersistedIdentity();
    const authorName = identity?.displayName?.trim() || "访客";
    const authorAvatar = identity?.avatarUrl?.trim() || null;

    if (worldMemoryRemote && (preferredType === "photo" || preferredType === "video")) {
      const accept = preferredType === "photo" ? fileAcceptsAsQuestPhoto : fileAcceptsAsQuestVideo;
      const candidates = Array.from(files).filter(accept);
      if (candidates.length === 0) {
        setError(
          "没有可上传的图片/视频（部分相册不返回文件类型，已按扩展名识别；请使用 jpg/png/heic/webp/avif 或 mp4/mov 等常见格式）。",
        );
        return;
      }

      const newRecs: QuestPhotoRecord[] = [];
      for (const file of candidates) {
        const res = await uploadWorldMediaWithMetaResult(file);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        const up = res.meta;
        const caption = file.name.replace(/\.[^/.]+$/, "") || "未命名";
        const mediaType: "image" | "video" = preferredType === "video" ? "video" : "image";
        const ins = await insertQuestPhotoClientResult({
          questVariant: variant,
          worldPlaceId: selected.id,
          placeQuery: selected.query,
          lat: selected.lat,
          lng: selected.lng,
          publicUrl: up.url,
          storagePath: up.storagePath ?? "",
          mimeType: up.mimeType ?? (file.type?.trim() || "application/octet-stream"),
          mediaType,
          bytes: typeof file.size === "number" ? file.size : 0,
          caption,
          authorName,
          authorAvatar,
        });
        if (!ins.ok) {
          setError(ins.error);
          return;
        }
        newRecs.push(ins.photo);
      }

      const nextPhotos = [...newRecs, ...placePhotos];
      setPlacePhotos(nextPhotos);
      const gallery = mergeGalleryUrls(nextPhotos, sceneObjects);
      const firstText = sceneObjects.find((m) => m.type === "text")?.content ?? "";
      const firstMusic = sceneObjects.find((m) => m.type === "music")?.url ?? "";
      const firstLink = sceneObjects.find((m) => m.type === "link")?.url ?? "";
      const recordedDate =
        sceneObjects.find((m) => m.type === "music")?.recordedAt?.slice(0, 10) ?? selected.recordedDate;
      const updated = isTrace
        ? await patchEchoOnServer(selected.id, {
            memoryObjects: sceneObjects,
            gallery,
            voiceNoteUrl: firstMusic,
            audioUrl: firstMusic,
            linkUrl: firstLink,
            recordedDate,
          })
        : await patchWishOnServer(selected.id, {
            memoryObjects: sceneObjects,
            gallery,
            voiceNoteUrl: firstMusic,
            audioUrl: firstMusic,
            linkUrl: firstLink,
            diary: firstText,
            recordedDate,
          });
      if (!updated) {
        setError("画廊索引同步失败，但 photos 已插入；请刷新页面。");
      }
      await refresh();
      return;
    }

    const next = [...sceneObjects];
    let uploaded = 0;
    for (const file of Array.from(files)) {
      const res = await uploadWorldMediaWithMetaResult(file);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const up = res.meta;
      uploaded += 1;
      if (preferredType === "photo") {
        next.push({ type: "photo", id: `photo-${Date.now()}-${Math.random()}`, createdAt: isoNow(), url: up.url });
      } else {
        next.push({ type: "video", id: `video-${Date.now()}-${Math.random()}`, createdAt: isoNow(), url: up.url });
      }
    }
    if (uploaded === 0) {
      setError("未选择可上传的媒体文件。");
      return;
    }
    await patchSelected(next);
  };

  const addLink = async () => {
    if (!selected) return;
    const url = window.prompt("Paste a link URL")?.trim() || "";
    if (!url) return;
    await patchSelected([...sceneObjects, { type: "link", id: `link-${Date.now()}`, createdAt: isoNow(), url, title: "Travel portal" }]);
  };

  const openNoteEditor = () => {
    if (!selected) return;
    touchRoryActivity();
    setPendingNoteId(`text-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    setNoteInitialContent("");
    setNoteEntrance("compose");
    setNoteRitualBootstrap((n) => n + 1);
    setNoteEditorOpen(true);
  };

  const openNoteFromSidebar = useCallback((id: string, content: string) => {
    touchRoryActivity();
    setPendingNoteId(id);
    setNoteInitialContent(content);
    setNoteEntrance("unwrap");
    setNoteRitualBootstrap((n) => n + 1);
    setNoteEditorOpen(true);
  }, []);

  const removeTextNoteById = useCallback(
    async (noteId: string) => {
      if (!selected) return;
      const next = sceneObjects.filter((o) => !(o.type === "text" && o.id === noteId));
      await patchSelected(next);
    },
    [selected, sceneObjects, patchSelected],
  );

  const removeScrapbookItem = useCallback(
    async (item: ScrapbookMediaItem) => {
      if (!selected) return;
      const api = placePhotos.find((p) => p.id === item.id);
      if (api) {
        if (worldMemoryRemote) {
          const ok = await deleteQuestPhotoClient(api.id);
          if (!ok) {
            setError("删除附件失败。");
            return;
          }
        }
        const nextPhotos = placePhotos.filter((p) => p.id !== item.id);
        setPlacePhotos(nextPhotos);
        const gallery = mergeGalleryUrls(nextPhotos, sceneObjects);
        const firstText = sceneObjects.find((m) => m.type === "text")?.content ?? "";
        const firstMusic = sceneObjects.find((m) => m.type === "music")?.url ?? "";
        const firstLink = sceneObjects.find((m) => m.type === "link")?.url ?? "";
        const recordedDate =
          sceneObjects.find((m) => m.type === "music")?.recordedAt?.slice(0, 10) ?? selected.recordedDate;
        setSaving(true);
        setError(null);
        try {
          if (isTrace) {
            await patchEchoOnServer(selected.id, {
              memoryObjects: sceneObjects,
              gallery,
              voiceNoteUrl: firstMusic,
              audioUrl: firstMusic,
              linkUrl: firstLink,
              recordedDate,
            });
          } else {
            await patchWishOnServer(selected.id, {
              memoryObjects: sceneObjects,
              gallery,
              voiceNoteUrl: firstMusic,
              audioUrl: firstMusic,
              linkUrl: firstLink,
              diary: firstText,
              recordedDate,
            });
          }
          await refresh();
          touchRoryActivity();
        } finally {
          setSaving(false);
        }
        return;
      }
      const nextObjects = sceneObjects.filter(
        (o) =>
          !(
            (o.type === "photo" || o.type === "video") &&
            (o as Extract<MemoryObject, { type: "photo" } | { type: "video" }>).url === item.url
          ),
      );
      await patchSelected(nextObjects);
    },
    [selected, placePhotos, sceneObjects, worldMemoryRemote, isTrace, refresh],
  );

  const removeMark = async () => {
    if (!selected) return;
    if (isTrace) await deleteEchoOnServer(selected.id);
    else await deleteWishOnServer(selected.id);
    await refresh();
    setSelectedId(null);
  };

  useEffect(() => {
    if (variant !== "trace" || typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const star = u.searchParams.get("star");
    if (!star) return;
    u.searchParams.delete("star");
    window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
    queueMicrotask(() => setSelectedId(star));
  }, [variant]);

  const handleIgniteStruck = useCallback(() => {
    if (selectedId) setRitualPulseMarkerId(selectedId);
  }, [selectedId]);

  const handleIgniteComplete = useCallback(async () => {
    if (!selectedId || isTrace) return;
    const wish = rows.find((r) => r.id === selectedId) as VisionDream | undefined;
    if (!wish) return;
    setIgniteBusy(true);
    setError(null);
    try {
      const gallery = mergeGalleryUrls(placePhotos, sceneObjects);
      const echo = await convertWishToTraceOnServer(wish, gallery, sceneObjects);
      if (!echo) {
        setError("没迁过去，稍后再试或看下网络。");
        setRitualPulseMarkerId(null);
        return;
      }
      await refresh();
      setIgniteOpen(false);
      setRitualPulseMarkerId(null);
      sessionStorage.setItem("memory-tide-ignite-reveal", echo.id);
      router.push(`/trace?star=${encodeURIComponent(echo.id)}`);
    } finally {
      setIgniteBusy(false);
    }
  }, [selectedId, isTrace, rows, placePhotos, sceneObjects, refresh, router]);

  return (
    <MemoryTidePageShell suppressCentralSpotlight>
      <StationeryNoteEditor
        key={`note-ritual-${noteRitualBootstrap}-${pendingNoteId}`}
        open={noteEditorOpen}
        pendingNoteId={pendingNoteId}
        initialContent={noteInitialContent}
        entrance={noteEntrance}
        strand={isTrace ? "trace" : "wish"}
        worldMarkId={selected?.id ?? null}
        avatarUrl={sessionIdentity?.avatarUrl?.trim() || null}
        displayName={sessionIdentity?.displayName?.trim() || ""}
        onCommit={async (content) => {
          const existingIdx = sceneObjects.findIndex((o) => o.type === "text" && o.id === pendingNoteId);
          const textObj = {
            type: "text" as const,
            id: pendingNoteId,
            createdAt: existingIdx >= 0 ? (sceneObjects[existingIdx] as Extract<MemoryObject, { type: "text" }>).createdAt : isoNow(),
            content,
            noteStyle: "journal" as const,
          };
          const nextObjects =
            existingIdx >= 0 ? sceneObjects.map((o, i) => (i === existingIdx ? textObj : o)) : [...sceneObjects, textObj];
          const ok = await patchSelected(nextObjects);
          if (!ok) return false;
          await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          return true;
        }}
        onEnvelopeDelivered={(id) => setLandedEnvelopeNoteId(id)}
        onFullyClosed={() => setNoteEditorOpen(false)}
      />
      {!isTrace && igniteOpen && selectedId ? (
        <IgniteCeremonyOverlay
          open={igniteOpen}
          wishId={selectedId}
          getMarkerScreen={() => globeRef.current?.projectMarkerToScreen(selectedId) ?? null}
          onCancel={() => {
            setIgniteOpen(false);
            setRitualPulseMarkerId(null);
          }}
          onStruck={handleIgniteStruck}
          onStrikeComplete={handleIgniteComplete}
        />
      ) : null}
      <div className="relative flex min-h-0 w-full flex-1 flex-col pb-2">
        <button
          type="button"
          onClick={() => {
            if (markers.length === 0) openFirstMarkSheet();
            else setError("请点击地球上的发光记忆星，展开记忆宇宙后再编辑。");
          }}
          className="fixed left-[4rem] top-5 z-[125] flex h-10 max-w-[min(14rem,calc(100vw-6.5rem))] items-center gap-1.5 truncate rounded-full border border-violet-200/35 bg-violet-500/20 px-2.5 text-[11px] tracking-[0.12em] text-violet-50 shadow-[0_6px_24px_rgba(20,12,48,0.35)] backdrop-blur-md transition hover:border-violet-200/55 hover:bg-violet-500/28 sm:max-w-none sm:gap-2 sm:px-3.5 sm:text-xs"
          aria-label="Mark a Place"
        >
          <Star className="h-[15px] w-[15px] fill-amber-200/40 text-amber-100/90" aria-hidden strokeWidth={1.5} />
          Mark a Place
        </button>

        {/*
          画布高度必须落在真实像素上。flex-1 链在部分浏览器里仍会算短 → 上下像被切。
          直接绑定 100dvh（减顶栏占位），与主内容区 pt 对齐，避免再依赖 flex 传高度。
        */}
        <section
          className="relative flex w-full flex-col gap-3 overflow-visible lg:flex-row lg:items-stretch lg:gap-4"
          style={{ minHeight: "calc(100dvh - 5.5rem)" }}
        >
          <div className="globe-viewport relative z-0 h-[min(48vh,420px)] flex-shrink-0 overflow-hidden rounded-2xl lg:h-[calc(100dvh-5.5rem)] lg:min-h-[calc(100dvh-5.5rem)] lg:flex-1 lg:min-h-0">
            <MemoryTideGlobe
              ref={globeRef}
              markers={markers}
              selectedId={selectedId}
              fullMoon={isFullMoon}
              onSelectMarker={handleSelectMarker}
              ritualPulseMarkerId={ritualPulseMarkerId}
            />
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <MemoryShowcasePanel
                key={selected.id}
                variant={variant}
                markId={selected.id}
                placeName={selected.query}
                placePhotos={placePhotos}
                items={sceneObjects}
                saving={saving}
                celestialBirthday={celestialBirthday}
                landedEnvelopeNoteId={landedEnvelopeNoteId}
                igniteBusy={igniteBusy}
                onClose={() => setSelectedId(null)}
                onRemoveMark={() => void removeMark()}
                onOpenNote={openNoteFromSidebar}
                onRemoveTextNote={(id) => void removeTextNoteById(id)}
                onRemoveScrapbookItem={(item) => void removeScrapbookItem(item)}
                onIgniteToTrace={!isTrace ? () => setIgniteOpen(true) : undefined}
              />
            ) : null}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {firstMarkOpen ? (
            <motion.div
              key="first-mark"
              role="dialog"
              aria-modal="true"
              aria-label="Place your first memory star"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] flex items-end justify-center bg-black/25 px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[20vh] backdrop-blur-[2px]"
              onClick={() => setFirstMarkOpen(false)}
            >
              <motion.div
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-lg rounded-[28px] border border-white/14 bg-black/45 px-5 py-4 backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-display text-xs tracking-[0.18em] text-violet-200/75">First memory star</p>
                <p className="mt-1 text-sm leading-relaxed text-violet-100/90">在地球上点亮第一颗记忆星</p>
                <input
                  ref={queryInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="地点名或 lat,lng（例 25.04, 102.72）"
                  className="mt-4 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-violet-200/40"
                />
                {error ? (
                  <p className="mt-3 text-center text-xs leading-relaxed text-rose-300/95" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setFirstMarkOpen(false);
                    }}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs text-violet-200/85"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addMark()}
                    className="rounded-full border border-violet-300/40 bg-violet-500/25 px-4 py-2 text-xs text-violet-50 disabled:opacity-45"
                  >
                    {saving ? "保存中…" : "Place star"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {dockVisible ? (
            <motion.section
              key="memory-creator-dock"
              role="toolbar"
              aria-label="Memory creator"
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-6 left-1/2 z-40 flex w-[min(96vw,1680px)] max-w-none -translate-x-1/2 flex-col rounded-[999px] border border-white/14 bg-violet-500/5 px-7 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-[10px] sm:px-10"
            >
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  aria-label="Hide memory dock"
                  onClick={() => setDockCollapsed(true)}
                  className="rounded-full border border-white/10 bg-white/5 p-1 text-white/60 transition hover:bg-white/10 hover:text-white/90"
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex min-h-[120px] items-stretch gap-2.5 sm:gap-3">
                <DockActionButton label="Mark a Place" onClick={() => void addMark()}>
                  <MapPin strokeWidth={1.6} />
                </DockActionButton>
                <DockActionButton label="Photo" disabled={!selected} onClick={() => photoInputRef.current?.click()}>
                  <ImageIcon strokeWidth={1.6} />
                </DockActionButton>
                <DockActionButton label="Video" disabled={!selected} onClick={() => videoInputRef.current?.click()}>
                  <Video strokeWidth={1.6} />
                </DockActionButton>
                <DockActionButton label="Music" disabled={!selected} onClick={() => musicInputRef.current?.click()}>
                  <Music strokeWidth={1.6} />
                </DockActionButton>
                <DockActionButton label="Link" disabled={!selected} onClick={() => void addLink()}>
                  <Link2 strokeWidth={1.6} />
                </DockActionButton>
                <DockActionButton label="Note" disabled={!selected} onClick={openNoteEditor}>
                  <StickyNote strokeWidth={1.6} />
                </DockActionButton>
              </div>

              <div className="mt-3 flex min-h-[40px] items-center gap-2.5 pb-1">
                <input
                  ref={queryInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Location name (English) or lat,lng"
                  className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-xs text-white placeholder:text-violet-200/40"
                />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={timeDraft.slice(0, 10)}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-xs text-violet-100"
                >
                  <Calendar className="h-3.5 w-3.5 text-violet-200/80" strokeWidth={1.6} />
                  <span className="tabular-nums tracking-wide">{formatYmdSlash(timeDraft)}</span>
                </button>
                {selected ? (
                  <button
                    type="button"
                    onClick={() => void removeMark()}
                    className="shrink-0 rounded-full border border-rose-300/35 px-3 py-2.5 text-[10px] text-rose-100"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {!worldMemoryRemote && !remoteHintDismissed ? (
                <div className="mt-2 flex flex-col items-center gap-1 px-3">
                  <p className="text-center text-[10px] leading-relaxed text-amber-200/85">
                    记忆库未从服务器同步，标记会先保存在此浏览器；换设备或清缓存前请留意备份。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.sessionStorage.setItem(REMOTE_HINT_DISMISS_KEY, "1");
                      } catch {
                        /* */
                      }
                      setRemoteHintDismissed(true);
                    }}
                    className="text-[10px] font-medium text-amber-200/90 underline decoration-amber-200/35 underline-offset-2 hover:text-amber-50"
                  >
                    知道了
                  </button>
                </div>
              ) : null}
              {error ? <p className="mt-1 px-3 text-center text-xs text-rose-300">{error}</p> : null}
              {saving ? <p className="mt-1 px-3 pb-1 text-center text-xs text-violet-200/80">Saving…</p> : null}
            </motion.section>
          ) : null}
        </AnimatePresence>

        <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onPickMedia(e.target.files, "photo")} />
        <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => void onPickMedia(e.target.files, "video")} />
        <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => void onPickMedia(e.target.files, "music")} />
      </div>
    </MemoryTidePageShell>
  );
}
