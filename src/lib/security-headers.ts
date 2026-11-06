/**
 * Security headers for every HTML response (set on the root route).
 * The Content-Security-Policy is enforced (SEG-2): the browser blocks anything not listed here.
 * A new origin used by the browser goes into CSP_SOURCES (and is checked by scripts/qa/csp.ts).
 */

/** Origins the browser talks to, besides the app itself. */
export const CSP_SOURCES = {
  /** Map tiles (src/lib/map-tiles.ts): OpenStreetMap, or Esri with the ArcGIS key. */
  tiles: [
    "https://tile.openstreetmap.org",
    "https://static-map-tiles-api.arcgis.com",
    "https://ibasemaps-api.arcgis.com",
  ],
  /** APIs called from the browser. Weather (MET Norway) is fetched by the server; no routing API. */
  apis: [] as string[],
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
    // Fonts are self-hosted (public/fonts): no Google Fonts origin.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["font-src", ["'self'", "data:"]],
    ["img-src", ["'self'", "data:", "blob:", ...supabase.slice(0, 1), ...s.tiles]],
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
    "Content-Security-Policy": contentSecurityPolicy(supabaseUrl),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Location for the map and the challenges, camera for photo proofs; only on this site.
    "Permissions-Policy": "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()",
    // HTTPS only for a year on exploreekaya.com and its subdomains (ignored by browsers over http).
    // No "preload" until the domain has run on HTTPS for a while.
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}
