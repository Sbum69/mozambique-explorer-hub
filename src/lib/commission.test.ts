import { describe, expect, it } from "vitest";

import { commissionSplit, formatBp, formatCents, isFounderActive, toCents } from "./commission";

describe("M1 commission rounding (mirrors public.commission_split)", () => {
  it("splits an even amount", () => {
    expect(commissionSplit(250000, 1000, 0)).toEqual({
      commissionCents: 25000,
      providerFeeCents: 0,
      netCents: 225000,
    });
  });

  it("rounds half up to the centavo and reconciles", () => {
    // Same cases as supabase/tests/m1_commission.sql.
    expect(commissionSplit(12345, 1000, 600)).toEqual({
      commissionCents: 1235,
      providerFeeCents: 741,
      netCents: 10369,
    });
    const s = commissionSplit(370368, 800, 0);
    expect(s.commissionCents).toBe(29629);
    expect(s.commissionCents + s.providerFeeCents + s.netCents).toBe(370368);
  });

  it("never loses centavos over many amounts", () => {
    for (let g = 0; g < 5000; g += 7) {
      const s = commissionSplit(g, 1000, 650);
      expect(s.commissionCents + s.providerFeeCents + s.netCents).toBe(g);
      expect(s.netCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("free activities have no commission", () => {
    expect(commissionSplit(0, 1000, 600)).toEqual({
      commissionCents: 0,
      providerFeeCents: 0,
      netCents: 0,
    });
  });

  it("refuses invalid amounts", () => {
    expect(() => commissionSplit(-1, 1000, 0)).toThrow("INVALID_AMOUNT");
    expect(() => commissionSplit(1.5, 1000, 0)).toThrow("INVALID_AMOUNT");
  });

  it("converts and formats amounts and rates", () => {
    expect(toCents(1234.56)).toBe(123456);
    expect(formatCents(150000, "en")).toBe("1,500 MZN");
    expect(formatCents(123456, "en")).toBe("1,234.56 MZN");
    expect(formatBp(1000, "en")).toBe("10%");
    expect(formatBp(750, "pt")).toBe("7,5%");
  });
});

describe("M1 Founding Partner period", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  it("is active between since and until", () => {
    expect(
      isFounderActive(
        {
          founderSince: "2026-10-01T00:00:00Z",
          founderUntil: "2027-04-01T00:00:00Z",
          freeHighlightsUsed: 0,
        },
        now,
      ),
    ).toBe(true);
  });
  it("expires after until", () => {
    expect(
      isFounderActive(
        {
          founderSince: "2026-01-01T00:00:00Z",
          founderUntil: "2026-07-01T00:00:00Z",
          freeHighlightsUsed: 0,
        },
        now,
      ),
    ).toBe(false);
  });
  it("is off without terms", () => {
    expect(isFounderActive(null, now)).toBe(false);
  });
});
