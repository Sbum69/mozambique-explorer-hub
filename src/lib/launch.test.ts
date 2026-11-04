import { describe, expect, it } from "vitest";

import { errorMessage, launchChecks, launchStatusFromRaw, toReadiness } from "./launch";

const raw = {
  min_businesses: 5,
  min_experiences: 5,
  approved_businesses: 5,
  active_experiences: 4,
  pending_leads: 2,
  placements_waiting: 0,
  admins_without_2fa: 1,
  errors_7d: 3,
  read_at: "2026-11-04T10:00:00Z",
  businesses: [
    {
      id: "b1",
      name: "Casa",
      status: "pending",
      has_owner: false,
      missing: ["address" as const],
      experiences: [{ id: "e1", title: "Passeio", active: false, missing: null }],
    },
  ],
};

describe("launch status", () => {
  it("blocks the launch below the minimums and with an admin without 2FA", () => {
    const checks = launchChecks(launchStatusFromRaw(raw));
    expect(checks.find((c) => c.key === "businesses")?.ok).toBe(true);
    expect(checks.find((c) => c.key === "experiences")?.ok).toBe(false);
    expect(checks.find((c) => c.key === "admins2fa")?.ok).toBe(false);
    expect(checks.filter((c) => c.blocking).map((c) => c.key)).toEqual([
      "businesses",
      "experiences",
      "admins2fa",
    ]);
  });

  it("maps a business to the readiness checklist with its warnings", () => {
    const r = toReadiness(launchStatusFromRaw(raw).businesses[0]);
    expect(r.warnings).toEqual(["not_approved", "no_owner"]);
    expect(r.experiences[0].missing).toEqual([]);
  });
});

describe("error logger", () => {
  it("keeps real errors and skips noise", () => {
    expect(errorMessage(new TypeError("x is undefined"))).toBe("TypeError: x is undefined");
    expect(errorMessage(new Error("ResizeObserver loop completed"))).toBeNull();
    expect(errorMessage({})).toBeNull();
    expect(errorMessage("a".repeat(400))?.length).toBe(300);
  });
});
