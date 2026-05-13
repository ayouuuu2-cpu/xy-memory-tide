/** 手记编辑实时草稿（与仪式 Rory 状态解耦，仅按文本写入）。 */
export const STATIONERY_DRAFT_LS_PREFIX = "memory-tide-stationery-draft";

export function stationeryDraftKey(noteId: string): string {
  return `${STATIONERY_DRAFT_LS_PREFIX}:${noteId}`;
}

export function persistStationeryDraft(noteId: string, content: string): void {
  try {
    window.localStorage.setItem(stationeryDraftKey(noteId), content);
  } catch {
    // ignore quota / private mode
  }
}
