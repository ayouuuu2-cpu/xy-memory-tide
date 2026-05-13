"use client";

import { useEffect } from "react";
import { tryFireBirthdayDesktopNotifications } from "@/lib/birthday-scheduled-notifications";

/**
 * 注册 `public/memory-tide-sw.js`，并以约 45s 间隔检查是否到达 9/14 09:14 与 11/12 11:12 的本地通知窗口。
 */
export function MemoryTideSwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    void navigator.serviceWorker.register("/memory-tide-sw.js", { scope: "/" }).catch(() => {
      /* 非 HTTPS 或浏览器禁用 */
    });

    const tick = () => {
      if (cancelled) return;
      tryFireBirthdayDesktopNotifications();
    };
    tick();
    const id = window.setInterval(tick, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return null;
}
