import { describe, expect, it } from "vitest";
import { deriveImpactView, isRealisedBooking, type ImpactStats } from "./impact-stats";

const now = new Date("2026-10-19T12:00:00Z");
const base: ImpactStats = {
  generated_at: now.toISOString(),
  platform: {
    destinations: 6, active_activities: 8, approved_businesses: 9, community_experiences: 54, public_routes: 34,
    accounts: 17, bookings_total: 2,
    bookings_by_status: { pending: 2, confirmed: 0, completed: 0, rejected: 0, cancelled: 0 },
    activities_by_province: { maputo: 6, inhambane: 2 },
  },
  verified: { completed_bookings: 0, completed_people: 0, businesses_with_completed: 0, completed_routes: 0, stops_with_proof: 0, completed_by_province: {} },
};

describe("impact rules", () => {
  it("pending, confirmed, cancelled and rejected are never realised tourism", () => {
    for (const status of ["pending", "confirmed", "cancelled", "rejected"] as const)
      expect(isRealisedBooking({ status, date: "2026-01-01", time: "09:00" }, now)).toBe(false);
  });
  it("completed booking in the past is realised", () => {
    expect(isRealisedBooking({ status: "completed", date: "2026-10-19", time: "13:00" }, now)).toBe(true);
  });
  it("completed booking that has not started (Mozambique time) is not realised", () => {
    expect(isRealisedBooking({ status: "completed", date: "2026-10-19", time: "15:00" }, now)).toBe(false);
  });
  it("zero verified records gives the empty state", () => {
    expect(deriveImpactView(base).hasVerifiedImpact).toBe(false);
  });
  it("never produces a revenue figure", () => {
    expect(deriveImpactView(base).revenue).toBeNull();
  });
  it("hides verified province groups below 3", () => {
    const v = deriveImpactView({ ...base, verified: { ...base.verified, completed_bookings: 5, completed_by_province: { maputo: 3, sofala: 2 } } });
    expect(v.verifiedProvinceRows).toEqual([{ name: "maputo", count: 3 }]);
  });
  it("province shares come from real activity counts", () => {
    expect(deriveImpactView(base).provinceRows).toEqual([
      { name: "maputo", count: 6, pct: 75 },
      { name: "inhambane", count: 2, pct: 25 },
    ]);
  });
});
