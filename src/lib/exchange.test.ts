import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { convert, isStale, rateTableFromRows, round2 } from "./exchange";

const perUsd = { USD: 1, MZN: 63.749358, EUR: 0.892784, ZAR: 16.578102, GBP: 0.747655 };
const NOW = new Date("2026-10-24T12:00:00Z");
const rows = Object.entries(perUsd).map(([currency, v]) => ({
  currency,
  per_usd: String(v),
  rate_date: "2026-10-24T00:02:31Z",
  source: "open.er-api.com (ExchangeRate-API)",
}));

describe("DADOS-1 currency converter", () => {
  it("converts through USD and rounds to 2 decimals", () => {
    expect(convert(100, "USD", "MZN", { perUsd })).toBe(6374.94);
    expect(convert(1000, "MZN", "USD", { perUsd })).toBe(15.69);
    expect(convert(50, "EUR", "MZN", { perUsd })).toBe(3570.26);
    expect(convert(250, "ZAR", "GBP", { perUsd })).toBe(11.27);
    expect(convert(0, "GBP", "MZN", { perUsd })).toBe(0);
    expect(convert(42, "MZN", "MZN", { perUsd })).toBe(42);
  });

  it("rounds half away from zero without binary drift", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(-1.005)).toBe(-1.01);
  });

  it("rejects an invalid currency or amount", () => {
    expect(() => convert(10, "BTC", "MZN", { perUsd })).toThrow("INVALID_CURRENCY");
    expect(() => convert(10, "USD", "mzn", { perUsd })).toThrow("INVALID_CURRENCY");
    expect(() => convert(-1, "USD", "MZN", { perUsd })).toThrow("INVALID_AMOUNT");
    expect(() => convert(Number.NaN, "USD", "MZN", { perUsd })).toThrow("INVALID_AMOUNT");
  });

  it("fails when a rate is missing or not positive", () => {
    expect(() => convert(10, "USD", "ZAR", { perUsd: { USD: 1, MZN: 63 } })).toThrow(
      "RATE_MISSING",
    );
    expect(() => convert(10, "USD", "MZN", { perUsd: { USD: 1, MZN: 0 } })).toThrow("RATE_MISSING");
  });
});

describe("DADOS-1 rate table from exchange_rates rows", () => {
  it("builds the table when every currency has a fresh rate", () => {
    const t = rateTableFromRows(rows, NOW);
    expect(t?.perUsd.MZN).toBeCloseTo(63.749358);
    expect(t?.rateDate).toBe("2026-10-24T00:02:31Z");
  });

  it("hides the converter (null) when a currency is missing", () => {
    expect(
      rateTableFromRows(
        rows.filter((r) => r.currency !== "GBP"),
        NOW,
      ),
    ).toBeNull();
    expect(rateTableFromRows([], NOW)).toBeNull();
  });

  it("hides the converter (null) when the rates are older than 7 days", () => {
    expect(isStale("2026-10-16T00:00:00Z", NOW)).toBe(true);
    expect(isStale("2026-10-20T00:00:00Z", NOW)).toBe(false);
    expect(isStale("not a date", NOW)).toBe(true);
    const old = rows.map((r) => ({ ...r, rate_date: "2026-10-01T00:00:00Z" }));
    expect(rateTableFromRows(old, NOW)).toBeNull();
  });
});
