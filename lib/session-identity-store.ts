/** Tab-session display name for uploads (in-memory only; not localStorage/sessionStorage). */
export type PersistedUserIdentity = {
  displayName: string;
  avatarUrl?: string;
  /** ms since epoch when user confirmed identity */
  settledAt: number;
};

let sessionIdentity: PersistedUserIdentity | null = null;

export function getSessionIdentity(): PersistedUserIdentity | null {
  return sessionIdentity;
}

export function setSessionIdentity(next: PersistedUserIdentity | null): void {
  sessionIdentity = next;
}
