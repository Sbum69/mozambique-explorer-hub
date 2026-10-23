import { describe, expect, test } from "vitest";
import { businessRegistrationSchema } from "./business-registration";

const valid = {
  businessName: "Banca da Ana",
  businessType: "small",
  category: "craft",
  provinceCode: "MPM",
  location: "Maputo",
  description: "Artesanato local",
  contact: "+258 84 000 0000",
};

describe("SEG-1 business registration schema", () => {
  test("accepts the business fields", () =>
    expect(businessRegistrationSchema.safeParse(valid).success).toBe(true));
  test("trims text fields", () =>
    expect(
      businessRegistrationSchema.parse({ ...valid, businessName: "  Banca da Ana  " }).businessName,
    ).toBe("Banca da Ana"));
  test("business type is only small or large", () =>
    expect(businessRegistrationSchema.safeParse({ ...valid, businessType: "admin" }).success).toBe(
      false,
    ));
  test("business name needs at least 2 characters", () =>
    expect(businessRegistrationSchema.safeParse({ ...valid, businessName: " A " }).success).toBe(
      false,
    ));
  test("every business field is required", () => {
    for (const key of Object.keys(valid)) {
      const { [key]: _omit, ...rest } = valid as Record<string, string>;
      expect(businessRegistrationSchema.safeParse(rest).success, key).toBe(false);
    }
  });
  test("blank category, province or contact is rejected", () => {
    for (const key of ["category", "provinceCode", "contact"]) {
      expect(businessRegistrationSchema.safeParse({ ...valid, [key]: "   " }).success, key).toBe(
        false,
      );
    }
  });
  test("oversized fields are rejected", () =>
    expect(
      businessRegistrationSchema.safeParse({ ...valid, description: "x".repeat(5001) }).success,
    ).toBe(false));
  test("account, owner and approval fields are never accepted from the client", () => {
    const parsed = businessRegistrationSchema.parse({
      ...valid,
      email: "someone@example.com",
      password: "secret123",
      redirectTo: "https://evil.example",
      displayName: "Someone",
      owner_id: "11111111-1111-4111-8111-111111111111",
      userId: "11111111-1111-4111-8111-111111111111",
      status: "approved",
      verified: true,
    });
    for (const key of [
      "email",
      "password",
      "redirectTo",
      "displayName",
      "owner_id",
      "userId",
      "status",
      "verified",
    ]) {
      expect(key in parsed, key).toBe(false);
    }
  });
});
