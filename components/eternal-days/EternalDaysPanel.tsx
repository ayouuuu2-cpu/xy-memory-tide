"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useWorldMemory } from "@/contexts/WorldMemoryContext";
import { isCloudGalleryClient } from "@/lib/gallery-cloud-config";
import { uploadWorldMedia } from "@/lib/world-memory-client";
import { WhisperPlayer } from "@/components/whisper/WhisperPlayer";
import {
  addMilestone,
  ensureDefaultAnchor,
  formatAnnualDate,
  getDaysSinceAnchor,
  loadAnchorIso,
  loadMilestones,
  patchMilestone,
  removeMilestone,
  saveAnchorIso,
  type Milestone,
} from "@/lib/eternal-days";

type Props = {
  open: boolean;
  onClose: () => void;
  onAnchorChange?: () => void;
};

export function EternalDaysPanel({ open, onClose, onAnchorChange }: Props) {
  const { refresh: refreshWorld, worldMemoryRemote } = useWorldMemory();
  const [days, setDays] = useState(0);
  const [anchorInput, setAnchorInput] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState(9);
  const [day, setDay] = useState(14);

  const refresh = useCallback(async () => {
    await refreshWorld();
    await ensureDefaultAnchor();
    setDays(getDaysSinceAnchor());
    setAnchorInput(loadAnchorIso() ?? "");
    setMilestones(loadMilestones());
  }, [refreshWorld]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const onSaveAnchor = async () => {
    const v = anchorInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      await saveAnchorIso(v);
      await refresh();
      onAnchorChange?.();
    }
  };

  const onAdd = () => {
    const t = title.trim() || "Whisper";
    const list = addMilestone({
      title: t,
      anniversaryMonth: month,
      anniversaryDay: day,
      voiceNoteUrl: "",
    });
    setMilestones(list);
    setTitle("");
  };

  const onVoiceFile = async (m: Milestone, file: File | null) => {
    if (!file) return;
    if (!isCloudGalleryClient()) return;
    const url = await uploadWorldMedia(file);
    if (!url) return;
    const list = patchMilestone(m.id, { voiceNoteUrl: url });
    setMilestones(list);
    await refreshWorld();
    setMilestones(loadMilestones());
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="Close Days"
            className="memory-tide-eternal-scrim absolute inset-0"
            onClick={onClose}
          />
          <div className="memory-tide-eternal-panel-wrap relative z-10 w-full max-w-lg px-3 pb-5 sm:px-0 sm:pb-0">
            <motion.div
              role="dialog"
              aria-labelledby="eternal-days-title"
              className="memory-tide-eternal-panel max-h-[min(88dvh,720px)] w-full overflow-y-auto rounded-t-[1.75rem] px-5 pb-8 pt-5 sm:rounded-[1.75rem] sm:p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="eternal-days-title" className="memory-tide-eternal-title text-xl sm:text-2xl">
                    Days
                  </h2>
                  <p className="memory-tide-eternal-subline mt-1 text-[10px] font-medium uppercase tracking-[0.28em]">
                    Whispers · milestones
                  </p>
                </div>
                <button type="button" className="memory-tide-eternal-close-pearl shrink-0" onClick={onClose} aria-label="Close">
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>

              <p className="memory-tide-eternal-days-hero mt-5">D+{days}</p>
              <p className="memory-tide-eternal-body mt-2 text-xs leading-relaxed">
                Your counter since the anchor below. Each milestone can hold a Whisper that only unlocks on its yearly date.
              </p>
              {!worldMemoryRemote ? (
                <p className="memory-tide-eternal-body mt-3 rounded-xl border border-amber-200/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-50/95">
                  云端接口未连上时，纪念日会先写在本浏览器。要在部署环境跨设备同步，请在服务端配置 Supabase（含 Service Role），保存环境变量后重新部署一次。
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="memory-tide-eternal-label flex flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Anchor date
                  <span className="memory-tide-eternal-field-wrap">
                    <input
                      type="date"
                      value={anchorInput}
                      onChange={(e) => setAnchorInput(e.target.value)}
                      className="memory-tide-eternal-field text-sm"
                    />
                  </span>
                </label>
                <button type="button" onClick={onSaveAnchor} className="memory-tide-eternal-pearl-btn shrink-0 self-start sm:self-end">
                  Save anchor
                </button>
              </div>

              <div className="memory-tide-eternal-divider" aria-hidden />
              <p className="memory-tide-eternal-label font-display text-[10px] font-bold uppercase tracking-[0.22em]">New milestone</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <span className="memory-tide-eternal-field-wrap sm:col-span-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="memory-tide-eternal-field text-sm"
                  />
                </span>
                <label className="memory-tide-eternal-label flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Month
                  <span className="memory-tide-eternal-field-wrap">
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="memory-tide-eternal-field cursor-pointer text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleString(undefined, { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="memory-tide-eternal-label flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Day
                  <span className="memory-tide-eternal-field-wrap">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={day}
                      onChange={(e) => setDay(Number(e.target.value))}
                      className="memory-tide-eternal-field text-sm"
                    />
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={onAdd}
                className="memory-tide-eternal-pearl-btn memory-tide-eternal-pearl-btn--wide mt-5 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                Add milestone
              </button>

              <ul className="mt-8 space-y-4">
                {milestones.map((m) => (
                  <li key={m.id} className="memory-tide-eternal-milestone rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="memory-tide-eternal-milestone-title font-display text-sm font-medium">{m.title}</p>
                        <p className="memory-tide-eternal-body mt-0.5 text-[11px]">
                          {formatAnnualDate(m.anniversaryMonth, m.anniversaryDay)} · yearly
                        </p>
                      </div>
                      <button
                        type="button"
                        className="memory-tide-eternal-milestone-remove rounded-xl p-2"
                        aria-label={`Remove ${m.title}`}
                        onClick={() => setMilestones(removeMilestone(m.id))}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    <div className="mt-3">
                      <WhisperPlayer
                        voiceNoteUrl={m.voiceNoteUrl}
                        anniversary={{ month: m.anniversaryMonth, day: m.anniversaryDay }}
                        label={m.title}
                        compact
                      />
                    </div>
                    <label className="memory-tide-eternal-label mt-3 block text-[10px] font-semibold uppercase tracking-[0.18em]">
                      Attach / replace whisper
                      <input
                        type="file"
                        accept="audio/*"
                        className="memory-tide-eternal-file mt-2 block w-full text-[11px] file:border-0 file:bg-transparent"
                        onChange={(e) => onVoiceFile(m, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </li>
                ))}
              </ul>

              {milestones.length === 0 && (
                <p className="memory-tide-eternal-body mt-6 text-center text-xs">No milestones yet — add a date and a whisper.</p>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
