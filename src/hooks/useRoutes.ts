import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchMyRoutes,
  fetchPublicRoutes,
  fetchRouteById,
  type ItineraryRoute,
} from "@/lib/routes";

/**
 * Itinerary catalogue: public routes plus, when signed in, the user's own routes
 * (including the private ones, which the public policy hides).
 */
export function useRouteCatalogue(userId: string | null, { enabled = true } = {}) {
  const [publicRoutes, setPublicRoutes] = useState<ItineraryRoute[]>([]);
  const [myRoutes, setMyRoutes] = useState<ItineraryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const identity = useRef(userId);
  identity.current = userId;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const [pub, mine] = await Promise.all([
        fetchPublicRoutes(),
        userId ? fetchMyRoutes(userId) : Promise.resolve([]),
      ]);
      if (version !== request.current || identity.current !== userId) return;
      setLoadedFor(userId);
      setPublicRoutes(pub);
      setMyRoutes(mine);
    } catch (e) {
      if (version === request.current && identity.current === userId)
        setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      if (version === request.current && identity.current === userId) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    setMyRoutes([]);
    void load();
    return () => {
      request.current += 1;
    };
  }, [load, enabled]);

  const owned = loadedFor === userId ? myRoutes : [];
  const mineIds = new Set(owned.map((r) => r.id));
  const all = [...owned, ...publicRoutes.filter((r) => !mineIds.has(r.id))];

  return { all, publicRoutes, myRoutes: owned, loading, error, reload: load };
}

export function useRoute(id: string | null, userId: string | null = null) {
  const [route, setRoute] = useState<ItineraryRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const key = `${userId ?? "guest"}:${id ?? ""}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const [loadedKey, setLoadedKey] = useState("");

  const load = useCallback(async () => {
    const version = ++request.current;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchRouteById(id);
      if (version !== request.current || currentKey.current !== key) return;
      setRoute(next);
      setLoadedKey(key);
    } catch (e) {
      if (version === request.current && currentKey.current === key) {
        setRoute(null);
        setLoadedKey(key);
        setError(e instanceof Error ? e.message : "load-failed");
      }
    } finally {
      if (version === request.current && currentKey.current === key) setLoading(false);
    }
  }, [id, key]);

  useEffect(() => {
    void load();
    return () => {
      request.current += 1;
    };
  }, [load]);

  return {
    route: loadedKey === key ? route : null,
    loading: loading || (!!id && loadedKey !== key),
    error,
    reload: load,
  };
}
