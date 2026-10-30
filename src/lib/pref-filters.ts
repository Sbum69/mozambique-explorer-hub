/**
 * Starting filters built from the saved travel preferences (onboarding / settings).
 * Pages start from these values; the user can change the filters without touching the saved
 * preferences, and "Reset to my preferences" brings these values back.
 */

export interface SavedPrefs {
  /** Province codes (provinces.code). */
  provinces: string[];
  durationDays?: number;
  interests: string[];
}

export type DurationBucket = "all" | "short" | "mid" | "long";

/** Same buckets as the itinerary duration filter: 1–2, 3–4 and 5+ days. */
export function durationBucket(days: number | undefined): DurationBucket {
  if (!days || days < 1) return "all";
  if (days <= 2) return "short";
  if (days <= 4) return "mid";
  return "long";
}

/** First saved interest that the page offers as a filter, in the order the user saved them. */
export function firstOffered<T extends string>(
  interests: string[],
  offered: readonly T[],
): T | null {
  return (
    (interests.find((i) => (offered as readonly string[]).includes(i)) as T | undefined) ?? null
  );
}

/** Province id (as used by the selects) of the first saved province that exists in the list. */
export function preferredProvinceId(
  prefs: SavedPrefs,
  provinces: { id: string; code: string }[],
): string | null {
  for (const code of prefs.provinces) {
    const hit = provinces.find((p) => p.code === code);
    if (hit) return hit.id;
  }
  return null;
}

export interface RouteFilters {
  province: string;
  duration: DurationBucket;
  interest: string | null;
}

export const NO_ROUTE_FILTERS: RouteFilters = { province: "all", duration: "all", interest: null };

export function routeFiltersFromPrefs(
  prefs: SavedPrefs | null,
  provinces: { id: string; code: string }[],
  offeredInterests: readonly string[],
): RouteFilters | null {
  if (!prefs || !prefs.provinces.length) return null;
  return {
    province: preferredProvinceId(prefs, provinces) ?? "all",
    duration: durationBucket(prefs.durationDays),
    interest: firstOffered(prefs.interests, offeredInterests),
  };
}

/** True when an item's province (code) is one of the saved provinces. */
export function inPreferredProvinces(code: string | null | undefined, prefs: SavedPrefs): boolean {
  return !!code && prefs.provinces.includes(code);
}

export function sameFilters<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
