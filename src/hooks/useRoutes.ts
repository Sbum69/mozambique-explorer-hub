import { useCallback, useEffect, useState } from "react";

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
export function useRouteCatalogue(userId: string | null) {
  const [publicRoutes, setPublicRoutes] = useState<ItineraryRoute[]>([]);
  const [myRoutes, setMyRoutes] = useState<ItineraryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pub, mine] = await Promise.all([
        fetchPublicRoutes(),
        userId ? fetchMyRoutes(userId) : Promise.resolve([]),
      ]);
      setPublicRoutes(pub);
      setMyRoutes(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mineIds = new Set(myRoutes.map((r) => r.id));
  const all = [...myRoutes, ...publicRoutes.filter((r) => !mineIds.has(r.id))];

  return { all, publicRoutes, myRoutes, loading, error, reload: load };
}

export function useRoute(id: string | null) {
  const [route, setRoute] = useState<ItineraryRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRoute(await fetchRouteById(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { route, loading, error, reload: load };
}
