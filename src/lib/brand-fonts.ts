/**
 * Brand fonts are not part of the critical stylesheet: the A/B in PERF-4 showed they delayed the first
 * paint by about 0.5 s on a slow phone. They are added once, after the page has loaded and the browser
 * is idle (so not even client-rendered pages such as the dashboard wait for them); text first shows
 * in the system fallback and then switches (font-display: swap).
 */
export const BRAND_FONTS_HREF = "/fonts/fonts.css";

function addLink(doc: Document): void {
  if (doc.querySelector(`link[href="${BRAND_FONTS_HREF}"]`)) return;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = BRAND_FONTS_HREF;
  doc.head.appendChild(link);
}

export function loadBrandFonts(win: Window = window): void {
  // Safari has no requestIdleCallback: a short timeout after load does the same job.
  const whenIdle = () =>
    typeof win.requestIdleCallback === "function"
      ? win.requestIdleCallback(() => addLink(win.document), { timeout: 2000 })
      : win.setTimeout(() => addLink(win.document), 200);
  if (win.document.readyState === "complete") whenIdle();
  else win.addEventListener("load", whenIdle, { once: true });
}
