import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { adminErrorText, isValidEmail, isValidReason } from "./admin";

describe("ADM-1 admin form rules", () => {
  it("a suspension or cancellation reason needs at least 3 characters", () => {
    expect(isValidReason("  ok ")).toBe(false);
    expect(isValidReason("Fraude")).toBe(true);
  });
  it("owner assignment needs a valid email", () => {
    expect(isValidEmail("dono@exemplo.co.mz")).toBe(true);
    expect(isValidEmail("dono@")).toBe(false);
    expect(isValidEmail("sem email")).toBe(false);
  });
});

describe("ADM-1 server errors shown in PT and EN", () => {
  it("translates each server code", () => {
    expect(adminErrorText("USER_NOT_CONFIRMED", "pt")).toMatch(/não confirmou/);
    expect(adminErrorText("USER_HAS_BUSINESS", "en")).toMatch(/already has a business/);
    expect(adminErrorText("LAST_ADMIN", "pt")).toMatch(/pelo menos um administrador/);
    expect(adminErrorText("CANNOT_REVOKE_OWN_ADMIN", "en")).toMatch(/your own administrator/);
    expect(adminErrorText("FORBIDDEN", "pt")).toMatch(/Só administradores/);
    expect(adminErrorText("Booking is in a final state", "en")).toMatch(/already closed/);
  });
  it("a specific code wins over a generic one", () => {
    expect(adminErrorText("USER_NOT_FOUND", "en")).toMatch(/No account/);
    expect(adminErrorText("NOT_FOUND", "en")).toMatch(/Record not found/);
  });
  it("unknown errors never leak raw text", () => {
    expect(adminErrorText("duplicate key value violates", "pt")).toBe(
      "Não foi possível concluir. Tenta novamente.",
    );
  });
});
