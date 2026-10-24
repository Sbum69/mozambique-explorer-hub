import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { isRewardRedeemable, maputoToday, rewardErrorText, rewardSchema } from "./rewards";

const valid = {
  businessId: "11111111-1111-4111-8111-111111111111",
  titlePt: "Bebida grátis",
  titleEn: "Free drink",
  descriptionPt: "",
  descriptionEn: "",
  costPoints: 200,
  stock: null,
  validUntil: null,
  active: true,
};

describe("10B reward form", () => {
  it("accepts a reward with unlimited stock and no end date", () =>
    expect(rewardSchema.safeParse(valid).success).toBe(true));
  it("cost must be a whole number of at least 1 point", () => {
    expect(rewardSchema.safeParse({ ...valid, costPoints: 0 }).success).toBe(false);
    expect(rewardSchema.safeParse({ ...valid, costPoints: 1.5 }).success).toBe(false);
  });
  it("needs a Portuguese title and a valid date", () => {
    expect(rewardSchema.safeParse({ ...valid, titlePt: " " }).success).toBe(false);
    expect(rewardSchema.safeParse({ ...valid, validUntil: "31/12/2026" }).success).toBe(false);
  });
});

describe("10B reward availability", () => {
  const today = "2026-10-24";
  it("active, in stock and in date is redeemable", () =>
    expect(isRewardRedeemable({ active: true, stock: 3, validUntil: "2026-10-24" }, today)).toBe(
      true,
    ));
  it("inactive, sold out or expired is not", () => {
    expect(isRewardRedeemable({ active: false, stock: null, validUntil: null }, today)).toBe(false);
    expect(isRewardRedeemable({ active: true, stock: 0, validUntil: null }, today)).toBe(false);
    expect(isRewardRedeemable({ active: true, stock: null, validUntil: "2026-10-23" }, today)).toBe(
      false,
    );
  });
  it("uses Mozambique's date, not the browser's", () =>
    expect(maputoToday(new Date("2026-10-23T22:30:00Z"))).toBe("2026-10-24"));
  it("translates server error codes in PT and EN", () => {
    expect(rewardErrorText("voucher_not_found", "pt")).toMatch(/Voucher não encontrado/);
    expect(rewardErrorText("own_reward", "en")).toMatch(/your own business/);
  });
});
