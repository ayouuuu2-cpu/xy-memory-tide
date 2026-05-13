const LS_LAST_SEAL = "memory-tide-note-ritual-last-seal";

export type NoteRitualSealPayload = {
  markId: string | null;
  noteId: string;
  strand: "trace" | "wish";
  /** 全文存档（与 contentPreview 并存，便于离线完整恢复） */
  fullContent: string;
  contentPreview: string;
  contentLength: number;
  sealedAt: number;
};

/** 封存动画完成瞬间写入本地，便于离线回显与调试（与 PATCH 并行，不替代服务端真相源）。 */
export function persistNoteRitualSeal(payload: NoteRitualSealPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_LAST_SEAL, JSON.stringify(payload));
    window.localStorage.setItem(
      `memory-tide-sealed-note:${payload.noteId}`,
      JSON.stringify({
        noteId: payload.noteId,
        markId: payload.markId,
        strand: payload.strand,
        text: payload.fullContent,
        sealedAt: payload.sealedAt,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}
