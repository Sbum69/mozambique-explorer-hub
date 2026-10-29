import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const SUPA = "https://abcd.supabase.co";

describe("security headers", () => {
  it("sends the basic protections on every page", () => {
    const h = securityHeaders(SUPA);
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("geolocation=(self)");
    expect(h["Permissions-Policy"]).toContain("camera=(self)");
    expect(h["Permissions-Policy"]).toContain("microphone=()");
  });

  it("keeps the CSP in report-only mode (it cannot break the app)", () => {
    const h = securityHeaders(SUPA);
    expect(h["Content-Security-Policy-Report-Only"]).toBeTruthy();
    expect(h["Content-Security-Policy"]).toBeUndefined();
  });

  it("allows the app's own backend and the map tiles", () => {
    const csp = contentSecurityPolicy(SUPA);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/abcd\.supabase\.co/);
    expect(csp).toMatch(/connect-src [^;]*wss:\/\/abcd\.supabase\.co/);
    expect(csp).toMatch(/img-src [^;]*https:\/\/\*\.tile\.openstreetmap\.org/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/frame-ancestors 'self' [^;]*lovable/);
  });

  it("still builds a policy without a backend URL", () => {
    expect(contentSecurityPolicy(undefined)).toContain("default-src 'self'");
    expect(contentSecurityPolicy("not a url")).not.toContain("not a url");
  });
});
