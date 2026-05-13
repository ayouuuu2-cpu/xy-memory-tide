"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { RORY_SIDEBAR_IDLE } from "@/lib/rory-assets";

const DISMISS_KEY = "memory-tide-rory-notify-toast-dismissed";

/**
 * 启动时若浏览器支持且尚未授权通知，由 Rory 邀请开启（点击后 requestPermission）。
 */
export function RoryNotificationPermissionToast() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    if (Notification.permission === "default") setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed bottom-5 left-1/2 z-[240] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="flex gap-3 rounded-2xl border border-violet-300/35 bg-[#120a24]/92 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <Image
          src={RORY_SIDEBAR_IDLE}
          alt=""
          width={52}
          height={52}
          className="memory-tide-rory-ethereal h-[52px] w-auto shrink-0 object-contain"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-medium leading-snug text-violet-50">
            Rory 想在星轨交汇的特殊日子寄信给你，可以开启提醒吗？✨
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-full border border-violet-400/45 bg-violet-500/35 px-3 py-1.5 text-[11px] text-violet-50 disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                try {
                  await Notification.requestPermission();
                } finally {
                  setBusy(false);
                  setOpen(false);
                }
              }}
            >
              开启提醒
            </button>
            <button
              type="button"
              className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] text-violet-200/75"
              onClick={() => {
                sessionStorage.setItem(DISMISS_KEY, "1");
                setOpen(false);
              }}
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
