/**
 * Public pages for search engines (sitemap.xml) and the private ones kept out (robots.txt).
 * Private pages also need a session, so they never show content to crawlers.
 */
export const PUBLIC_SITEMAP_PATHS = [
  "/home",
  "/para-negocios",
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

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function sitemapXml(origin: string): string {
  const base = origin.replace(/\/$/, "");
  const urls = PUBLIC_SITEMAP_PATHS.map(
    (p) => `  <url><loc>${xmlEscape(base + p)}</loc></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return [
    "User-agent: *",
    "Allow: /",
    ...PRIVATE_PATH_PREFIXES.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}
