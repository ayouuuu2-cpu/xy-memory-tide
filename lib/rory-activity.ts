/** 手记 / 保存等交互时调用，供 Rory 侧栏等订阅「活跃度」提示（可扩展为 analytics）。 */
import { touchRoryLastTouch } from "@/lib/rory-memory-stale";

export function touchRoryActivity(): void {
  if (typeof window === "undefined") return;
  touchRoryLastTouch();
  try {
    window.dispatchEvent(new CustomEvent("memory-tide-rory-activity"));
  } catch {
    /* ignore */
  }
}
