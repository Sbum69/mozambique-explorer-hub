import { useCallback, useRef, useState } from "react";

import { sameFilters } from "@/lib/pref-filters";

/**
 * Filter state that starts from the saved preferences. Only the user's own changes are stored; until
 * there is one, the value follows the preferences (they load after the first render), so their
 * arrival needs no effect and no extra render. Changing the filters never changes the preferences.
 */
export function usePrefilledFilters<T>(fromPrefs: T | null, empty: T) {
  const [override, setOverride] = useState<T | null>(null);
  const value = override ?? fromPrefs ?? empty;
  const current = useRef(value);
  current.current = value;

  const set = useCallback((next: T | ((cur: T) => T)) => {
    setOverride(typeof next === "function" ? (next as (cur: T) => T)(current.current) : next);
  }, []);

  const reset = useCallback(() => setOverride(null), []);

  return {
    value,
    set,
    reset,
    /** Saved preferences exist and the filters currently differ from them. */
    canReset: !!fromPrefs && override !== null && !sameFilters(override, fromPrefs),
    hasPrefs: !!fromPrefs,
  };
}
