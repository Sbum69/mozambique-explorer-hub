import { describe, expect, it } from "vitest";

import {
  contentSecurityPolicy,
  createCspNonce,
  reportOnlyContentSecurityPolicy,
  securityHeaders,
} from "./security-headers";

const SUPA = "https://abcd.supabase.co";

describe("security headers", () => {
  it("sends the basic protections on every page", () => {
    const h = securityHeaders(SUPA);
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(h["Permissions-Policy"]).toContain("geolocation=(self)");
    expect(h["Permissions-Policy"]).toContain("camera=(self)");
    expect(h["Permissions-Policy"]).toContain("microphone=()");
  });

  it("enforces the CSP (no report-only header)", () => {
    const h = securityHeaders(SUPA);
    expect(h["Content-Security-Policy"]).toBeTruthy();
    expect(h["Content-Security-Policy-Report-Only"]).toBeUndefined();
  });

  it("allows the app's own backend and the map tiles", () => {
    const csp = contentSecurityPolicy(SUPA);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/abcd\.supabase\.co/);
    expect(csp).toMatch(/connect-src [^;]*wss:\/\/abcd\.supabase\.co/);
    expect(csp).toMatch(/img-src [^;]*https:\/\/tile\.openstreetmap\.org/);
    expect(csp).toMatch(/img-src [^;]*https:\/\/static-map-tiles-api\.arcgis\.com/);
    // No routing or weather API in the browser any more (OSRM removed, MET Norway via the server).
    expect(csp).not.toMatch(/osrm|open-meteo|api\.met\.no|arcgisonline/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/frame-ancestors 'self' [^;]*lovable/);
  });

  it("keeps 'unsafe-inline' in the enforced policy (test mode does not change it)", () => {
    expect(contentSecurityPolicy(SUPA)).toMatch(/script-src 'self' 'unsafe-inline'/);
  });

  it("test policy: inline scripts only with the nonce, other directives unchanged", () => {
    const ro = reportOnlyContentSecurityPolicy(SUPA, "abc123==");
    const scriptSrc = ro.split("; ").find((d) => d.startsWith("script-src "));
    expect(scriptSrc).toBe("script-src 'self' 'nonce-abc123=='");
    const rest = (p: string) => p.split("; ").filter((d) => !d.startsWith("script-src "));
    expect(rest(ro)).toEqual(rest(contentSecurityPolicy(SUPA)));
  });

  it("creates a different base64 nonce of 16 bytes each time", () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a).not.toBe(b);
    expect(atob(a)).toHaveLength(16);
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("still builds a policy without a backend URL", () => {
    expect(contentSecurityPolicy(undefined)).toContain("default-src 'self'");
    expect(contentSecurityPolicy("not a url")).not.toContain("not a url");
  });
});
