/**
 * Protects a public server function that calls an outside service (news feed, weather) from
 * being turned into a request amplifier by anonymous traffic:
 *  - concurrent callers share the one request already in flight;
 *  - after a failed answer, nobody asks the service again for `retryAfterMs`
 *    (the caller serves its fallback: an older real answer or "unavailable").
 * Successful answers are cached by the caller, as before. Per server instance, in memory.
 */
export const UPSTREAM_RETRY_MS = 2 * 60 * 1000;

export interface UpstreamGuard<T> {
  /** Runs `fetcher` unless a failure is still cooling down (then returns `fallback()`). */
  run(fetcher: () => Promise<T>, fallback: () => T): Promise<T>;
}

export function createUpstreamGuard<T>(
  isOk: (value: T) => boolean,
  retryAfterMs: number = UPSTREAM_RETRY_MS,
  now: () => number = Date.now,
): UpstreamGuard<T> {
  let inFlight: Promise<T> | null = null;
  let failedUntil = 0;
  return {
    run(fetcher, fallback) {
      if (inFlight) return inFlight;
      if (now() < failedUntil) return Promise.resolve(fallback());
      const p = fetcher()
        .then((value) => {
          failedUntil = isOk(value) ? 0 : now() + retryAfterMs;
          return value;
        })
        .catch((e: unknown) => {
          failedUntil = now() + retryAfterMs;
          throw e;
        })
        .finally(() => {
          inFlight = null;
        });
      inFlight = p;
      return p;
    },
  };
}
