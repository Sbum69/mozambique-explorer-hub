import { CANONICAL_ORIGIN } from "@/lib/app-info";

/**
 * Public pages for search engines (sitemap.xml) and the private ones kept out (robots.txt).
 * Private pages also need a session, so they never show content to crawlers.
 */
export const PUBLIC_SITEMAP_PATHS = [
  "/home",
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

/** True on exploreekaya.com itself; *.lovable.app and other hosts are copies kept out of search. */
export function isCanonicalOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === CANONICAL_ORIGIN;
  } catch {
    return false;
  }
}

/** Canonical URL of a public page on exploreekaya.com, or null for private pages. */
export function canonicalUrl(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0] || "/";
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (PRIVATE_PATH_PREFIXES.some((p) => clean === p.replace(/\/$/, "") || clean.startsWith(p)))
    return null;
  return CANONICAL_ORIGIN + clean;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Always lists the canonical domain, whatever host serves the file. */
export function sitemapXml(): string {
  const base = CANONICAL_ORIGIN;
  const urls = PUBLIC_SITEMAP_PATHS.map(
    (p) => `  <url><loc>${xmlEscape(base + p)}</loc></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Canonical domain: normal rules. Any other host (*.lovable.app preview, copies): nothing. */
export function robotsTxt(origin: string): string {
  if (!isCanonicalOrigin(origin)) return ["User-agent: *", "Disallow: /", ""].join("\n");
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
