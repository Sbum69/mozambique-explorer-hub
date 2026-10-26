import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { adminErrorText, broadcastProblems, isValidEmail, isValidReason } from "./admin";

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

describe("ADM-2C notice form rules (same as the admin_broadcasts CHECKs)", () => {
  const ok = {
    audience: "all" as const,
    userId: null,
    titlePt: "Manutenção",
    titleEn: "Maintenance",
    bodyPt: "A app estará em manutenção.",
    bodyEn: "The app will be under maintenance.",
    link: "",
  };
  it("accepts a valid notice, with or without an internal link", () => {
    expect(broadcastProblems(ok)).toEqual([]);
    expect(broadcastProblems({ ...ok, link: "/news-alerts" })).toEqual([]);
  });
  it("needs a user when the audience is one user", () => {
    expect(broadcastProblems({ ...ok, audience: "user" })).toEqual(["user"]);
  });
  it("refuses texts that are too short or too long, in either language", () => {
    expect(broadcastProblems({ ...ok, titlePt: " A " })).toEqual(["titlePt"]);
    expect(broadcastProblems({ ...ok, titleEn: "x".repeat(161) })).toEqual(["titleEn"]);
    expect(broadcastProblems({ ...ok, bodyEn: "x".repeat(2001), bodyPt: "" })).toEqual([
      "bodyPt",
      "bodyEn",
    ]);
  });
  it("refuses external and protocol-relative links", () => {
    expect(broadcastProblems({ ...ok, link: "https://evil.example" })).toEqual(["link"]);
    expect(broadcastProblems({ ...ok, link: "//evil.example" })).toEqual(["link"]);
  });
  it("maps the new server errors to PT and EN", () => {
    expect(adminErrorText("RATE_LIMITED", "pt")).toMatch(/10 avisos por hora/);
    expect(
      adminErrorText('new row violates check constraint "admin_broadcasts_link_check"', "en"),
    ).toMatch(/Invalid text or link/);
  });
});
