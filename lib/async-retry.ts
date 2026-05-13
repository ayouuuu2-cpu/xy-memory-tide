/**
 * Transient failures (network blips, cold Vercel, upstream 5xx) — safe for idempotent GETs only.
 * Do not wrap mutating POST/PUT that are not idempotent.
 */
function isTransientFetchFailure(message: string): boolean {
  return /fetch failed|Failed to fetch|network|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|502|503|504|429|Service Unavailable|Bad Gateway/i.test(
    message,
  );
}

export async function withRetryTransient<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const baseDelayMs = options?.baseDelayMs ?? 400;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts - 1) break;
      const msg = e instanceof Error ? e.message : String(e);
      if (!isTransientFetchFailure(msg)) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
