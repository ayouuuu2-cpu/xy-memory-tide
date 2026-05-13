/** 上次任意互动（拾遗/未竟相关操作、Rory 活跃度等），供 Rory 打瞌睡判定 */
const LS_LAST_TOUCH = "memory-tide-rory-last-touch-ms";
/** 兼容旧键：记忆写入时间戳 */
const LS_LAST_MEMORY_WRITE = "memory-tide-rory-last-memory-write-ms";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function readLastTouchMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const a = window.localStorage.getItem(LS_LAST_TOUCH);
    const b = window.localStorage.getItem(LS_LAST_MEMORY_WRITE);
    const na = a ? Number(a) : 0;
    const nb = b ? Number(b) : 0;
    const u = Math.max(Number.isFinite(na) ? na : 0, Number.isFinite(nb) ? nb : 0);
    return u;
  } catch {
    return 0;
  }
}

/** 任意拾遗/未竟相关互动时调用（保存、编辑、打开手记等） */
export function touchRoryLastTouch(): void {
  if (typeof window === "undefined") return;
  const t = String(Date.now());
  try {
    window.localStorage.setItem(LS_LAST_TOUCH, t);
  } catch {
    /* ignore */
  }
}

export function touchRoryWorldMemoryWrite(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_LAST_MEMORY_WRITE, String(Date.now()));
  } catch {
    /* ignore */
  }
  touchRoryLastTouch();
}

/** 从未有过时间戳 → 不瞌睡；超过 3 天无更新 → 瞌睡。 */
export function isRoryMemorySleepy(): boolean {
  const last = readLastTouchMs();
  if (last === 0) return false;
  return Date.now() - last > THREE_DAYS_MS;
}
