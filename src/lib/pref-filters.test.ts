import { describe, expect, it } from "vitest";

import {
  NO_ROUTE_FILTERS,
  durationBucket,
  firstOffered,
  inPreferredProvinces,
  preferredProvinceId,
  routeFiltersFromPrefs,
  sameFilters,
} from "./pref-filters";

const PROVINCES = [
  { id: "p-maputo", code: "maputo" },
  { id: "p-inhambane", code: "inhambane" },
];
const ROUTE_INTERESTS = ["beach", "culture", "food", "nature"] as const;

describe("UX-1 filters prefilled from the saved preferences", () => {
  it("maps trip days to the itinerary duration buckets", () => {
    expect(durationBucket(undefined)).toBe("all");
    expect(durationBucket(0)).toBe("all");
    expect(durationBucket(1)).toBe("short");
    expect(durationBucket(2)).toBe("short");
    expect(durationBucket(3)).toBe("mid");
    expect(durationBucket(4)).toBe("mid");
    expect(durationBucket(7)).toBe("long");
  });

  it("picks the first saved interest the page offers, keeping the saved order", () => {
    expect(firstOffered(["festival", "food", "beach"], ROUTE_INTERESTS)).toBe("food");
    expect(firstOffered(["festival"], ROUTE_INTERESTS)).toBeNull();
    expect(firstOffered([], ROUTE_INTERESTS)).toBeNull();
  });

  it("finds the province id of the first saved province that exists", () => {
    expect(preferredProvinceId({ provinces: ["inhambane"], interests: [] }, PROVINCES)).toBe(
      "p-inhambane",
    );
    expect(preferredProvinceId({ provinces: ["gone", "maputo"], interests: [] }, PROVINCES)).toBe(
      "p-maputo",
    );
    expect(preferredProvinceId({ provinces: ["gone"], interests: [] }, PROVINCES)).toBeNull();
  });

  it("builds the itinerary filters from province, days and interests", () => {
    expect(
      routeFiltersFromPrefs(
        { provinces: ["inhambane"], durationDays: 3, interests: ["festival", "beach"] },
        PROVINCES,
        ROUTE_INTERESTS,
      ),
    ).toEqual({ province: "p-inhambane", duration: "mid", interest: "beach" });
  });

  it("gives no prefilled filters without saved provinces (visitors, unfinished onboarding)", () => {
    expect(routeFiltersFromPrefs(null, PROVINCES, ROUTE_INTERESTS)).toBeNull();
    expect(
      routeFiltersFromPrefs({ provinces: [], interests: ["beach"] }, PROVINCES, ROUTE_INTERESTS),
    ).toBeNull();
  });

  it("keeps 'all provinces' while the province list has not loaded", () => {
    expect(
      routeFiltersFromPrefs({ provinces: ["maputo"], interests: [] }, [], ROUTE_INTERESTS),
    ).toEqual({ ...NO_ROUTE_FILTERS, province: "all" });
  });

  it("matches items by province code", () => {
    const prefs = { provinces: ["maputo"], interests: [] };
    expect(inPreferredProvinces("maputo", prefs)).toBe(true);
    expect(inPreferredProvinces("sofala", prefs)).toBe(false);
    expect(inPreferredProvinces(null, prefs)).toBe(false);
  });

  it("tells whether the filters still equal the preferences (reset button)", () => {
    const a: { province: string; duration: string; interest: string | null } = {
      province: "p",
      duration: "mid",
      interest: null,
    };
    expect(sameFilters(a, { ...a })).toBe(true);
    expect(sameFilters(a, { ...a, interest: "beach" })).toBe(false);
  });
});
