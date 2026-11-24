import { describe, expect, it } from "vitest";

import { GUIDE_STEPS } from "./guide";
import { REWARD_OFFER_TXT } from "./page-texts";
import { NEW_REWARD_SEARCH, newRewardAction, parseRewardParam } from "./reward-offer";
import { rewardSchema } from "./rewards";

describe("optional reward step for businesses", () => {
  it("links straight to the New reward form of the dashboard", () => {
    expect(NEW_REWARD_SEARCH).toEqual({ status: "all", reward: "new" });
  });

  it("accepts only ?reward=new", () => {
    expect(parseRewardParam("new")).toBe("new");
    for (const v of [undefined, null, "", "NEW", "edit", 1, ["new"]])
      expect(parseRewardParam(v)).toBeUndefined();
  });

  it("opens the form only with an approved business; otherwise explains", () => {
    expect(newRewardAction("new", 1)).toBe("open");
    expect(newRewardAction("new", 0)).toBe("explain");
    expect(newRewardAction(undefined, 1)).toBe("none");
  });

  it("the guide (first visit) has the same optional step, pointing at the rewards section", () => {
    const step = GUIDE_STEPS.business.find((s) => s.target === "biz-rewards");
    expect(step?.title.pt).toBe(REWARD_OFFER_TXT.pt.title);
    expect(step?.title.en).toBe(REWARD_OFFER_TXT.en.title);
  });

  it("says any product or service can be a reward, with no payment, delivered by the business", () => {
    expect(REWARD_OFFER_TXT.pt.body).toMatch(/produto ou serviço/);
    expect(REWARD_OFFER_TXT.en.body).toMatch(/product or service/);
    expect(REWARD_OFFER_TXT.pt.delivery).toMatch(/Não há pagamentos/);
    expect(REWARD_OFFER_TXT.en.delivery).toMatch(/no payments/);
  });

  it("the business sets title, description, cost, stock and validity (rules unchanged)", () => {
    const base = {
      businessId: "11111111-1111-4111-8111-111111111111",
      titlePt: "Café grátis",
      titleEn: "Free coffee",
      descriptionPt: "Um café na esplanada.",
      descriptionEn: "",
      costPoints: 200,
      stock: 10,
      validUntil: "2026-12-31",
      active: true,
    };
    expect(rewardSchema.safeParse(base).success).toBe(true);
    expect(rewardSchema.safeParse({ ...base, costPoints: 0 }).success).toBe(false);
    expect(rewardSchema.safeParse({ ...base, costPoints: 100001 }).success).toBe(false);
    expect(rewardSchema.safeParse({ ...base, stock: null, validUntil: null }).success).toBe(true);
  });
});
