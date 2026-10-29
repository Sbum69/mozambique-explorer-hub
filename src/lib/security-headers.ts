/**
 * Security headers for every HTML response (set on the root route).
 * The Content-Security-Policy starts in Report-Only mode: browsers log violations in the console
 * without blocking anything, so it cannot break the app or the Lovable preview while it is checked.
 */

/** Origins the browser talks to, besides the app itself. */
export const CSP_SOURCES = {
  tiles: [
    "https://*.tile.openstreetmap.org",
    "https://tile.openstreetmap.org",
    "https://server.arcgisonline.com",
  ],
  images: ["https://images.unsplash.com"],
  apis: ["https://router.project-osrm.org", "https://api.open-meteo.com"],
  /** The Lovable editor shows the app inside its own page (preview) and brokers the session. */
  lovable: ["https://lovable.dev", "https://*.lovable.dev", "https://*.lovable.app"],
};

export function contentSecurityPolicy(supabaseUrl: string | undefined): string {
  let supabase: string[] = [];
  try {
    if (supabaseUrl) {
      const u = new URL(supabaseUrl);
      supabase = [u.origin, `wss://${u.host}`];
    }
  } catch {
    supabase = [];
  }
  const s = CSP_SOURCES;
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // Hydration data and the theme script are inline.
    ["script-src", ["'self'", "'unsafe-inline'"]],
    ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
    ["font-src", ["'self'", "data:", "https://fonts.gstatic.com"]],
    ["img-src", ["'self'", "data:", "blob:", ...supabase.slice(0, 1), ...s.tiles, ...s.images]],
    ["connect-src", ["'self'", ...supabase, ...s.apis, ...s.lovable]],
    ["frame-src", ["'self'", ...s.lovable]],
    ["frame-ancestors", ["'self'", ...s.lovable]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["object-src", ["'none'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

export function securityHeaders(supabaseUrl: string | undefined): Record<string, string> {
  return {
    "Content-Security-Policy-Report-Only": contentSecurityPolicy(supabaseUrl),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Location for the map and the challenges, camera for photo proofs; only on this site.
    "Permissions-Policy": "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()",
  };
}
