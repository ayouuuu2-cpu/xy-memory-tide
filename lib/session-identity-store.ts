/** 身份在内存中更新时派发，供手记编辑器等订阅刷新。 */
export const MEMORY_TIDE_IDENTITY_CHANGE = "memory-tide-identity-change";
const MEMORY_TIDE_IDENTITY_KEY = "memory-tide.session.identity.v1";

/** Tab-session display name for uploads (in-memory only; not localStorage/sessionStorage). */
export type PersistedUserIdentity = {
  displayName: string;
  avatarUrl?: string;
  /** ms since epoch when user confirmed identity */
  settledAt: number;
};

let sessionIdentity: PersistedUserIdentity | null = null;

export function getSessionIdentity(): PersistedUserIdentity | null {
  if (sessionIdentity) return sessionIdentity;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEMORY_TIDE_IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedUserIdentity> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const displayName = typeof parsed.displayName === "string" ? parsed.displayName.trim() : "";
    if (!displayName) return null;
    const avatarUrl = typeof parsed.avatarUrl === "string" ? parsed.avatarUrl.trim() : undefined;
    const settledAt = typeof parsed.settledAt === "number" && Number.isFinite(parsed.settledAt) ? parsed.settledAt : Date.now();
    sessionIdentity = { displayName, avatarUrl, settledAt };
    return sessionIdentity;
  } catch {
    return null;
  }
}

function persistSessionIdentity(next: PersistedUserIdentity | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!next) {
      window.localStorage.removeItem(MEMORY_TIDE_IDENTITY_KEY);
      return;
    }
    window.localStorage.setItem(MEMORY_TIDE_IDENTITY_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage quota/private mode errors */
  }
}

export function setSessionIdentity(next: PersistedUserIdentity | null): void {
  sessionIdentity = next;
  persistSessionIdentity(next);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(MEMORY_TIDE_IDENTITY_CHANGE));
    } catch {
      /* ignore */
    }
  }
}

/** Debug/recovery hook for rare cases where bad local payload blocks identity recovery. */
export function clearSessionIdentityStorage(): void {
  sessionIdentity = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MEMORY_TIDE_IDENTITY_KEY);
  } catch {
    /* ignore */
  }
}
