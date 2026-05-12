/**
 * Session identity for uploads (nickname + optional avatar URL).
 * Held in memory for the tab — not written to localStorage or sessionStorage.
 */

import { getSessionIdentity, setSessionIdentity, type PersistedUserIdentity } from "@/lib/session-identity-store";

export type { PersistedUserIdentity };

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
  return getSessionIdentity();
}

export function savePersistedIdentity(identity: PersistedUserIdentity): void {
  if (typeof window === "undefined") return;
  setSessionIdentity({
    displayName: identity.displayName.trim(),
    avatarUrl: identity.avatarUrl?.trim() || undefined,
    settledAt: identity.settledAt,
  });
}

export function needsIdentityOnboarding(): boolean {
  return loadPersistedIdentity() === null;
}
