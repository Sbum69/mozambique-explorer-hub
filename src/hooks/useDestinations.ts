import { useCallback, useEffect, useState } from "react";

import { fetchDestinations, type Destination } from "@/lib/destinations";

/** In-flight request shared by components mounting at the same time (no stale data: cleared when it settles). */
let inflight: Promise<Destination[]> | null = null;
let cache: Destination[] | null = null;

const inBrowser = typeof window !== "undefined";

/**
 * Catalogue for a route loader: the same shared request in the browser; on the server a fresh read
 * per request (no module cache across visitors). Never throws: null lets the page fetch it later.
 */
export async function loadDestinationsForRoute(): Promise<Destination[] | null> {
  try {
    if (!inBrowser) return await fetchDestinations();
    if (cache) return cache;
    const list = await (inflight ??= fetchDestinations().finally(() => {
      inflight = null;
    }));
    cache = list;
    return list;
  } catch {
    return null;
  }
}

/**
 * Shared access point for the destination catalogue: one query, cached for the session.
 * initial: the list a route loader already read (server render), so the page starts with it.
 * enabled: false skips the request (a caller that only needs the list in rare cases).
 */
export function useDestinations(initial?: Destination[] | null, { enabled = true } = {}) {
  const seed = cache ?? initial ?? null;
  const [destinations, setDestinations] = useState<Destination[]>(seed ?? []);
  const [loading, setLoading] = useState(seed === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await (inflight ??= fetchDestinations().finally(() => {
        inflight = null;
      }));
      cache = list;
      setDestinations(list);
    } catch {
      setError("load-failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!cache && initial) cache = initial;
    if (cache) {
      setDestinations(cache);
      setLoading(false);
      return;
    }
    void load();
    // initial only seeds the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, enabled]);

  return {
    destinations,
    loading,
    error,
    isEmpty: !loading && !error && destinations.length === 0,
    reload: load,
  };
}
