import { useCallback, useEffect, useState } from "react";

import {
  fetchBusinessCategories,
  fetchProvinces,
  type BusinessCategory,
  type Province,
} from "@/lib/provinces";

let provincesInflight: Promise<Province[]> | null = null;
let provincesCache: Province[] | null = null;
let categoriesCache: BusinessCategory[] | null = null;

/** Shared province list (session cache, so pages don't re-query). */
export function useProvinces(includeInactive = false) {
  const [provinces, setProvinces] = useState<Province[]>(includeInactive ? [] : (provincesCache ?? []));
  const [loading, setLoading] = useState(includeInactive || !provincesCache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = includeInactive
        ? await fetchProvinces(true)
        : await (provincesInflight ??= fetchProvinces(false).finally(() => { provincesInflight = null; }));
      if (!includeInactive) provincesCache = rows;
      setProvinces(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    if (!includeInactive && provincesCache) {
      setProvinces(provincesCache);
      setLoading(false);
      return;
    }
    void load();
  }, [includeInactive, load]);

  return { provinces, loading, error, reload: load, isEmpty: !loading && !error && provinces.length === 0 };
}

export function useBusinessCategories() {
  const [categories, setCategories] = useState<BusinessCategory[]>(categoriesCache ?? []);
  const [loading, setLoading] = useState(!categoriesCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoriesCache) return;
    let active = true;
    fetchBusinessCategories()
      .then((rows) => {
        categoriesCache = rows;
        if (active) setCategories(rows);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "unknown");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading, error };
}
