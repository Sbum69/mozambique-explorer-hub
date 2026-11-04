import { describe, expect, it } from "vitest";

import {
  hasReceipt,
  maputoToday,
  needsAdmin,
  ownerCanCancel,
  placementEnd,
  placementError,
} from "./sponsored";

describe("M6 placement dates", () => {
  it("a week ends seven days later", () => {
    expect(placementEnd("2026-11-04", "week")).toBe("2026-11-11");
    expect(placementEnd("2026-12-29", "week")).toBe("2027-01-05");
  });

  it("a month ends like Postgres date + interval '1 month'", () => {
    expect(placementEnd("2026-11-04", "month")).toBe("2026-12-04");
    expect(placementEnd("2027-01-31", "month")).toBe("2027-02-28");
    expect(placementEnd("2028-01-31", "month")).toBe("2028-02-29");
    expect(placementEnd("2026-12-15", "month")).toBe("2027-01-15");
  });

  it("today is the Mozambique date", () => {
    // 22:30 UTC is already the next day in Maputo (UTC+2).
    expect(maputoToday(new Date("2026-11-04T22:30:00Z"))).toBe("2026-11-05");
    expect(maputoToday(new Date("2026-11-04T21:30:00Z"))).toBe("2026-11-04");
  });
});

describe("M6 placement status rules", () => {
  it("the owner cancels only before payment", () => {
    expect(ownerCanCancel("requested")).toBe(true);
    expect(ownerCanCancel("awaiting_payment")).toBe(true);
    for (const s of ["paid", "active", "expired", "rejected", "cancelled"] as const)
      expect(ownerCanCancel(s)).toBe(false);
  });

  it("the admin acts on requests and on payments to confirm", () => {
    expect(needsAdmin("requested")).toBe(true);
    expect(needsAdmin("awaiting_payment")).toBe(true);
    expect(needsAdmin("active")).toBe(false);
  });

  it("a receipt exists only after the payment is confirmed", () => {
    expect(hasReceipt({ status: "awaiting_payment", paidAt: null })).toBe(false);
    expect(hasReceipt({ status: "paid", paidAt: "2026-11-04T10:00:00Z" })).toBe(true);
    expect(hasReceipt({ status: "expired", paidAt: "2026-11-04T10:00:00Z" })).toBe(true);
    expect(hasReceipt({ status: "cancelled", paidAt: "2026-11-04T10:00:00Z" })).toBe(false);
  });

  it("maps database errors to codes", () => {
    expect(placementError("NO_SLOTS")).toBe("NO_SLOTS");
    expect(placementError('new row violates check constraint "placement_campaign"')).toBe(
      "INVALID_INPUT",
    );
    expect(placementError("network down")).toBe("generic");
  });
});
