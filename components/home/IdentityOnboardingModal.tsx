"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  loadPersistedIdentity,
  savePersistedIdentity,
  suggestRandomDisplayName,
  type PersistedUserIdentity,
} from "@/lib/user-identity";
import { saveMemoryDumpUploaderProfile } from "@/lib/memory-dump-storage";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after identity is saved (open file picker from parent). */
  onComplete: (identity: PersistedUserIdentity) => void;
};

export function IdentityOnboardingModal({ open, onClose, onComplete }: Props) {
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const existing = loadPersistedIdentity();
    if (existing) {
      setName(existing.displayName);
      setAvatarUrl(existing.avatarUrl ?? "");
      return;
    }
    setName(suggestRandomDisplayName());
    setAvatarUrl("");
  }, [open]);

  const submit = () => {
    const displayName = name.trim();
    if (!displayName) return;
    const identity: PersistedUserIdentity = {
      displayName,
      avatarUrl: avatarUrl.trim() || undefined,
      settledAt: Date.now(),
    };
    savePersistedIdentity(identity);
    saveMemoryDumpUploaderProfile({ name: displayName, avatar: identity.avatarUrl });
    onComplete(identity);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.45, 0.25, 1] }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="identity-onboarding-title"
            className="fixed left-1/2 top-1/2 z-[205] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[#0a0818]/95 px-5 py-6 shadow-[0_0_40px_rgba(140,120,220,0.25)] backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.985, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 4 }}
            transition={{ duration: 0.55, ease: [0.25, 0.45, 0.25, 1] }}
          >
            <h2 id="identity-onboarding-title" className="font-display text-lg font-semibold text-white/95">
              Your memory ID
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-violet-200/55">
              First upload — pick a nickname (or use the suggestion). We&apos;ll remember it in this browser for every
              new fragment.
            </p>
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white/90 outline-none placeholder:text-white/25 focus:border-violet-400/35"
                placeholder="e.g. LunarMoth"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="mt-2 text-[11px] text-violet-300/75 underline decoration-dotted underline-offset-4 hover:text-violet-200"
              onClick={() => setName(suggestRandomDisplayName())}
            >
              Generate another name
            </button>
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Avatar URL (optional)
              </span>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-xs text-white/85 outline-none placeholder:text-white/22 focus:border-violet-400/35"
                placeholder="https://…"
              />
            </label>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submit}
                className="memory-tide-eternal-pearl-btn rounded-full px-5 py-2 text-[11px]"
              >
                Save & continue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/12 px-4 py-2 text-[11px] text-white/55 hover:border-white/25 hover:text-white/80"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
