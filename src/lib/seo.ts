import { CANONICAL_ORIGIN } from "@/lib/app-info";

/**
 * Public pages for search engines (sitemap.xml) and the private ones kept out (robots.txt).
 * Private pages also need a session, so they never show content to crawlers.
 */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/para-negocios",
  "/precos-e-reembolsos",
  "/experiences",
  "/businesses",
  "/map",
  "/itineraries",
  "/community",
  "/culture-history",
  "/useful-info",
  "/news-alerts",
  "/impact",
  "/terms",
  "/privacy",
  "/creditos",
] as const;

export const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/auth/",
  "/bookings",
  "/business-dashboard",
  "/business-register",
  "/convite/",
  "/dashboard",
  "/favorites",
  "/forgot-password",
  "/gamification",
  "/onboarding",
  "/preferences",
  "/recibo/",
  "/reset-password",
  "/settings",
  "/voucher/",
] as const;

/** Canonical URL of a public page on exploreekaya.com, or null for private pages. */
export function canonicalUrl(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0] || "/";
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (PRIVATE_PATH_PREFIXES.some((p) => clean === p.replace(/\/$/, "") || clean.startsWith(p)))
    return null;
  // "/home" is the same page as "/": one address for search engines.
  return CANONICAL_ORIGIN + (clean === "/home" ? "/" : clean);
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A page in the sitemap: path on the canonical domain and, when known, its last change. */
export interface SitemapEntry {
  path: string;
  lastmod?: string | null;
}

/** Last content change of the static public pages (update it when they change). */
export const STATIC_PAGES_LASTMOD = "2026-11-12";

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);

/**
 * Always lists the canonical domain, whatever host serves the file. Static public pages first,
 * then the public detail pages read from the database (sitemap-entries.ts).
 */
export function sitemapXml(details: SitemapEntry[] = []): string {
  const base = CANONICAL_ORIGIN;
  const entries: SitemapEntry[] = [
    ...PUBLIC_SITEMAP_PATHS.map((path) => ({ path, lastmod: STATIC_PAGES_LASTMOD })),
    ...details,
  ];
  const urls = entries
    .map(({ path, lastmod }) => {
      const mod = day(lastmod);
      return `  <url><loc>${xmlEscape(base + path)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * Contents of public/robots.txt (a static file, the same on every host; seo.test keeps them equal).
 * Other hosts (*.lovable.app preview, copies) stay out of search through X-Robots-Tag: noindex
 * (robots-middleware.ts): a crawler blocked by robots.txt would never see that header.
 */
export function robotsTxt(): string {
  const base = CANONICAL_ORIGIN;
  return [
    "User-agent: *",
    "Allow: /",
    ...PRIVATE_PATH_PREFIXES.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}
