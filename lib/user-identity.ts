/**
 * Persistent browser identity for Memory Dump uploads (nickname + optional avatar).
 * Shown once on first upload; reused for all later uploads in this browser.
 */

import { UPLOADER_PROFILE_KEY } from "@/lib/memory-dump-storage";

const IDENTITY_KEY = "memory-tide-user-identity-v1";

export type PersistedUserIdentity = {
  displayName: string;
  avatarUrl?: string;
  /** ms since epoch when user confirmed identity */
  settledAt: number;
};

function safeParse(raw: string | null): PersistedUserIdentity | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return null;
    const o = j as Record<string, unknown>;
    const displayName = typeof o.displayName === "string" ? o.displayName.trim() : "";
    if (!displayName) return null;
    const avatarUrl = typeof o.avatarUrl === "string" ? o.avatarUrl.trim() : "";
    const settledAt = typeof o.settledAt === "number" ? o.settledAt : Date.now();
    return { displayName, avatarUrl: avatarUrl || undefined, settledAt };
  } catch {
    return null;
  }
}

/** Cute default if user skips typing (still explicit confirm in modal). */
export function suggestRandomDisplayName(): string {
  const part =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 6)
      : `${Date.now().toString(36)}`.slice(-6);
  return `Stardust-${part}`;
}

export function loadPersistedIdentity(): PersistedUserIdentity | null {
  if (typeof window === "undefined") return null;
  const direct = safeParse(window.localStorage.getItem(IDENTITY_KEY));
  if (direct) return direct;
  try {
    const legacy = window.localStorage.getItem(UPLOADER_PROFILE_KEY);
    if (!legacy) return null;
    const j = JSON.parse(legacy) as Record<string, unknown>;
    const name = typeof j.name === "string" ? j.name.trim() : "";
    const avatar = typeof j.avatar === "string" ? j.avatar.trim() : "";
    if (!name || name === "观星小管理员") return null;
    const migrated: PersistedUserIdentity = {
      displayName: name,
      avatarUrl: avatar || undefined,
      settledAt: Date.now(),
    };
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function savePersistedIdentity(identity: PersistedUserIdentity): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({
        displayName: identity.displayName.trim(),
        avatarUrl: identity.avatarUrl?.trim() || undefined,
        settledAt: identity.settledAt,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function needsIdentityOnboarding(): boolean {
  return loadPersistedIdentity() === null;
}
