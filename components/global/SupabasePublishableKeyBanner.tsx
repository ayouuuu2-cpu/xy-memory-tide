"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "xy-memory-tide:supabase-publishable-banner-dismissed";

/**
 * When `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the new `sb_publishable_` key, PostgREST + Realtime reject it.
 * Show an on-page hint so deployers see the fix without digging into the console only.
 */
export function SupabasePublishableKeyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
    if (!anon.startsWith("sb_publishable_")) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[9999] border-b border-amber-700/70 bg-amber-950/98 px-4 py-3 text-center text-[13px] leading-snug text-amber-50 shadow-lg"
    >
      <p className="mx-auto max-w-3xl">
        检测到 <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        为 <code className="rounded bg-black/30 px-1">sb_publishable_</code>{" "}
        格式。相册与 Realtime 需要 Supabase Dashboard → Settings → API 里以{" "}
        <code className="rounded bg-black/30 px-1">eyJ</code> 开头的 legacy「anon public」JWT；若{" "}
        <code className="rounded bg-black/30 px-1">/api/world-memory</code> 等仍 500，请同时检查{" "}
        <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> 是否为{" "}
        <code className="rounded bg-black/30 px-1">eyJ</code> 的 service_role。改完后请 Redeploy（或重启{" "}
        <code className="rounded bg-black/30 px-1">npm run dev</code>）。
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 text-xs text-amber-200/90 underline decoration-amber-500/80 underline-offset-2 hover:text-white"
      >
        本次会话隐藏
      </button>
    </div>
  );
}
