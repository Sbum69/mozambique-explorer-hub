import { describe, expect, it } from "vitest";

import { formatPrice } from "./price";

describe("activity price", () => {
  it("shows free activities as Grátis / Free", () => {
    expect(formatPrice(0, "pt")).toBe("Grátis");
    expect(formatPrice(0, "en")).toBe("Free");
  });

  it("shows other prices in MZN", () => {
    expect(formatPrice(1500, "en")).toBe("1,500 MZN");
    expect(formatPrice(1500, "pt")).toMatch(/^1\s?500 MZN$/);
  });
});
