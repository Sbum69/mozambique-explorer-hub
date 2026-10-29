import { useCallback, useEffect, useRef, useState } from "react";

import { sameFilters } from "@/lib/pref-filters";

/**
 * Filter state that starts from the saved preferences. Preferences load after the first render,
 * so they are applied when they arrive — unless the user already changed the filters.
 * Changing the filters never changes the saved preferences.
 */
export function usePrefilledFilters<T>(fromPrefs: T | null, empty: T) {
  const [value, setValue] = useState<T>(fromPrefs ?? empty);
  const touched = useRef(false);
  const key = JSON.stringify(fromPrefs);

  useEffect(() => {
    if (!touched.current && fromPrefs) setValue(fromPrefs);
    // `key` stands for fromPrefs (a new object on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((next: T | ((cur: T) => T)) => {
    touched.current = true;
    setValue(next);
  }, []);

  const reset = useCallback(() => {
    touched.current = false;
    setValue(fromPrefs ?? empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    value,
    set,
    reset,
    /** Saved preferences exist and the filters currently differ from them. */
    canReset: !!fromPrefs && !sameFilters(value, fromPrefs),
    hasPrefs: !!fromPrefs,
  };
}
