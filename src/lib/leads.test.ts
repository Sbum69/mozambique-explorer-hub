import { describe, expect, it } from "vitest";

import { leadImportRow, leadProblems, type Lead } from "./leads";

const ok = {
  businessName: "Casa da Matapa",
  provinceId: "p1",
  categoryCode: "restaurant",
  contactName: "Ana",
  contact: "+258 84 123 4567",
  acceptsBookings: true,
  message: "",
};

describe("M9 lead form checks", () => {
  it("accepts a phone or an email", () => {
    expect(leadProblems(ok)).toEqual([]);
    expect(leadProblems({ ...ok, contact: "ana@example.org" })).toEqual([]);
  });

  it("lists every missing field", () => {
    expect(
      leadProblems({
        ...ok,
        businessName: " ",
        provinceId: "",
        categoryCode: "",
        contactName: "",
        contact: "abc",
      }),
    ).toEqual(["businessName", "province", "category", "contactName", "contact"]);
  });
});

describe("M9 lead → import row", () => {
  const lead: Lead = {
    id: "l1",
    businessName: " Casa da Matapa ",
    provinceId: "p1",
    provinceCode: "inhambane",
    categoryCode: "restaurant",
    contactName: "Ana",
    contact: "ana@example.org",
    acceptsBookings: true,
    message: null,
    lang: "pt",
    status: "new",
    adminNote: null,
    businessId: null,
    createdAt: "2026-11-04T10:00:00Z",
  };

  it("builds a business row for the 0051 import, contact in the right field", () => {
    expect(leadImportRow(lead)).toEqual({
      kind: "business",
      name: "Casa da Matapa",
      province: "inhambane",
      category: "restaurant",
      email: "ana@example.org",
    });
    expect(leadImportRow({ ...lead, contact: "+258 84 123 4567" }).phone).toBe("+258 84 123 4567");
  });
});
