import { useCallback, useEffect, useState } from "react";

import {
  fetchAvailability,
  fetchExperiences,
  type AvailabilitySlot,
  type Experience,
} from "@/lib/experiences";

/** In-flight request shared by components mounting at the same time (no stale data: cleared when it settles). */
let inflight: Promise<Experience[]> | null = null;
let cache: Experience[] | null = null;

/** Shared access point for the experiences catalogue: one query, cached for the session. */
export function useExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await (inflight ??= fetchExperiences().finally(() => { inflight = null; }));
      cache = list;
      setExperiences(list);
    } catch {
      setError("load-failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cache) {
      setExperiences(cache);
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  return {
    experiences,
    loading,
    error,
    isEmpty: !loading && !error && experiences.length === 0,
    reload: load,
  };
}

/** Availability of one experience on a date, read from the database. */
export function useAvailability(experienceId: string | null, date: string | null) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experienceId || !date) {
      setSlots([]);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchAvailability(experienceId, date)
      .then((list) => {
        if (active) setSlots(list);
      })
      .catch(() => {
        if (active) setError("load-failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [experienceId, date]);

  return { slots, loading, error };
}
