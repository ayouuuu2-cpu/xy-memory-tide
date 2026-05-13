/** 手记弹窗开关 — Rory 侧栏订阅 */
export const RORY_STATIONERY_OPEN = "memory-tide-rory-stationery-open";
export const RORY_STATIONERY_CLOSE = "memory-tide-rory-stationery-close";
/** 用户在信纸内输入（debounce 由发送方控制） */
export const RORY_STATIONERY_TYPING = "memory-tide-rory-stationery-typing";
/** 长文或保存成功 — Rory celebrate + 可选 confetti 由发送方触发 */
export const RORY_STATIONERY_CELEBRATE = "memory-tide-rory-stationery-celebrate";

export function dispatchRoryStationeryOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RORY_STATIONERY_OPEN));
}

export function dispatchRoryStationeryClose(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RORY_STATIONERY_CLOSE));
}

export function dispatchRoryStationeryTyping(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RORY_STATIONERY_TYPING));
}

export function dispatchRoryStationeryCelebrate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RORY_STATIONERY_CELEBRATE));
}
