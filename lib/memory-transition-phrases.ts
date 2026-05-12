/** Mode A — memory fragment voice */
export const MEMORY_PHRASES_A = ["we were…", "I still remember…", "that day we…"] as const;

/** Mode B — system / retrieval voice */
export const MEMORY_PHRASES_B = ["loading memory…", "retrieving moment…", "syncing trace…"] as const;

/** Mode C — echo / spatial voice */
export const MEMORY_PHRASES_C = ["we were there", "there…", "there again"] as const;

export type MemoryTransitionMode = "fragment" | "system" | "echo";

export type ActivationPhrasePick = {
  mode: MemoryTransitionMode;
  text: string;
};

/** Random mode, then random line within that mode (spec: 3-mode randomized system). */
export function pickActivationPhrase(): ActivationPhrasePick {
  const roll = Math.floor(Math.random() * 3);
  if (roll === 0) {
    const i = Math.floor(Math.random() * MEMORY_PHRASES_A.length);
    return { mode: "fragment", text: MEMORY_PHRASES_A[i]! };
  }
  if (roll === 1) {
    const i = Math.floor(Math.random() * MEMORY_PHRASES_B.length);
    return { mode: "system", text: MEMORY_PHRASES_B[i]! };
  }
  const i = Math.floor(Math.random() * MEMORY_PHRASES_C.length);
  return { mode: "echo", text: MEMORY_PHRASES_C[i]! };
}

/** Total interstitial duration in ms — spec: 1.5–3 seconds. */
export function randomActivationDurationMs(): number {
  return 1500 + Math.floor(Math.random() * 1501);
}
