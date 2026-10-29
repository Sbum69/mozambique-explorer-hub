/**
 * Brand fonts are not part of the critical stylesheet: the A/B in PERF-4 showed they delayed the first
 * paint by about 0.5 s on a slow phone. They are added once, after hydration; text first shows in
 * the system fallback and then switches (font-display: swap).
 */
export const BRAND_FONTS_HREF = "/fonts/fonts.css";

export function loadBrandFonts(doc: Document = document): void {
  if (doc.querySelector(`link[href="${BRAND_FONTS_HREF}"]`)) return;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = BRAND_FONTS_HREF;
  doc.head.appendChild(link);
}
