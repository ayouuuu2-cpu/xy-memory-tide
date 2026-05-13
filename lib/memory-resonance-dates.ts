/** 9·14 / 11·12：与生日共鸣的标记日期（任意年份的 MM-DD） */
export function isMemoryResonanceDate(ymd: string): boolean {
  const raw = ymd.trim().slice(0, 10);
  if (raw.length < 10) return false;
  const md = raw.slice(5, 10);
  return md === "09-14" || md === "11-12";
}
