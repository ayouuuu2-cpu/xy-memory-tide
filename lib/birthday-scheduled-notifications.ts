/** 本地日历：9/14 与 11/12 的整点提醒（与 `lib/celestial.ts` 星座日一致） */
export const BIRTHDAY_NOTIFY_VIRGO = { month: 9, day: 14, hour: 9, minute: 14 } as const;
export const BIRTHDAY_NOTIFY_SCORPIO = { month: 11, day: 12, hour: 11, minute: 12 } as const;

function pushDedupeKey(tag: string, year: number): string {
  return `memory-tide-birthday-push:${tag}:${year}`;
}

function matchesSlot(d: Date, slot: { month: number; day: number; hour: number; minute: number }): boolean {
  return d.getMonth() + 1 === slot.month && d.getDate() === slot.day && d.getHours() === slot.hour && d.getMinutes() === slot.minute;
}

/**
 * 在已获得通知权限时，于指定分钟触发一次桌面通知（按自然年去重）。
 * 主线程定时调用；日期过后不会重复（仅当年该分钟窗口）。
 */
export function tryFireBirthdayDesktopNotifications(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const y = now.getFullYear();

  if (matchesSlot(now, BIRTHDAY_NOTIFY_VIRGO)) {
    const k = pushDedupeKey("virgo", y);
    if (localStorage.getItem(k)) return;
    try {
      localStorage.setItem(k, "1");
      new Notification("Memory Tide", {
        body: "✨ Rory 拍了拍你：星轨运行到了最灿烂的位置，快来开启你的生日星图！",
        tag: "memory-tide-birthday-virgo",
        icon: "/images/rory/rory-celebrate.png",
      });
    } catch {
      /* */
    }
    return;
  }

  if (matchesSlot(now, BIRTHDAY_NOTIFY_SCORPIO)) {
    const k = pushDedupeKey("scorpio", y);
    if (localStorage.getItem(k)) return;
    try {
      localStorage.setItem(k, "1");
      new Notification("Memory Tide", {
        body: "✨ Rory：今天是个温暖的日子，别忘了为 11.12 封存一份记忆。",
        tag: "memory-tide-birthday-scorpio",
        icon: "/images/rory/rory-typing.png",
      });
    } catch {
      /* */
    }
  }
}
