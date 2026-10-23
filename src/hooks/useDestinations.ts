import { useCallback, useEffect, useState } from "react";

import { fetchDestinations, type Destination } from "@/lib/destinations";

/** In-flight request shared by components mounting at the same time (no stale data: cleared when it settles). */
let inflight: Promise<Destination[]> | null = null;
let cache: Destination[] | null = null;

/** Shared access point for the destination catalogue: one query, cached for the session. */
export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await (inflight ??= fetchDestinations().finally(() => { inflight = null; }));
      cache = list;
      setDestinations(list);
    } catch {
      setError("load-failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cache) {
      setDestinations(cache);
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  return {
    destinations,
    loading,
    error,
    isEmpty: !loading && !error && destinations.length === 0,
    reload: load,
  };
}
