/**
 * Generates the logo files and icons in public/ from src/lib/brand.ts ("Coração do Índico").
 * Usage (from scripts/qa, after bun install): bun brand-assets.ts
 * sharp comes from the root node_modules (already there through the build tooling; not a root
 * dependency of ours); Playwright and the system Edge render the Open Graph image with the brand font.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { BRAND_COLORS as C, LOGO_LAST_A, faviconSvg, heartSvg, logoSvg } from "../../src/lib/brand";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PUB = REPO + "public";
const sharp = createRequire(REPO + "package.json")("sharp");

const write = (name: string, svg: string) => writeFileSync(`${PUB}/${name}`, svg + "\n");
const png = (svg: string, size: number, h = size) =>
  sharp(Buffer.from(svg), { density: 300 })
    .resize(size, h)
    .png({ palette: true, quality: 95, compressionLevel: 9, effort: 10 })
    .toBuffer();

// ---- SVG files ----
write("logo.svg", logoSvg({ attrs: 'role="img" aria-label="EKAYA"' }));
write("logo-dark.svg", logoSvg({ dark: true, attrs: 'role="img" aria-label="EKAYA"' }));
write("logo-mark.svg", logoSvg({ mark: true, attrs: 'role="img" aria-label="EKAYA"' }));
write("favicon.svg", faviconSvg());

// ---- favicon.ico: 16 px with a solid red heart, 32 px with the three colours ----
const ico16 = await png(logoSvg({ mark: true, solidHeart: true }), 16);
const ico32 = await png(logoSvg({ mark: true }), 32);
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size, e);
    head.writeUInt8(size, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}
writeFileSync(
  `${PUB}/favicon.ico`,
  ico([
    { size: 16, data: ico16 },
    { size: 32, data: ico32 },
  ]),
);

// ---- app icons: sand A with the heart on deep green ----
function appIcon({ rx, aHeight }: { rx: number; aHeight: number }): string {
  const s = aHeight / 100;
  const tx = (512 - 86 * s) / 2;
  const ty = (512 - aHeight) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" rx="${rx}" fill="${C.deep}"/>` +
    `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s}) translate(-327 0)">` +
    `<path d="${LOGO_LAST_A}" fill="${C.sand}"/>${heartSvg({ dark: true })}</g></svg>`
  );
}
const rounded = appIcon({ rx: 112, aHeight: 290 });
const square = appIcon({ rx: 0, aHeight: 290 });
// Maskable: everything inside the central safe circle (radius 40 %).
const maskable = appIcon({ rx: 0, aHeight: 230 });
writeFileSync(`${PUB}/icon-192.png`, await png(rounded, 192));
writeFileSync(`${PUB}/icon-512.png`, await png(rounded, 512));
writeFileSync(`${PUB}/icon-maskable-512.png`, await png(maskable, 512));
// iOS rounds the corners itself and paints transparent corners black: full square.
writeFileSync(`${PUB}/apple-touch-icon.png`, await png(square, 180));

// ---- email logo (PNG: email clients do not show SVG), shown at 160 × 39 ----
writeFileSync(`${PUB}/email-logo.png`, await png(logoSvg(), 320, 78));

// ---- web manifest ----
const manifest = {
  name: "EKAYA",
  short_name: "EKAYA",
  start_url: "/",
  display: "browser",
  lang: "pt",
  theme_color: C.deep,
  background_color: C.sand,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
writeFileSync(`${PUB}/site.webmanifest`, JSON.stringify(manifest, null, 2) + "\n");

// ---- Open Graph image 1200 × 630: logo on sand with "Descobre Moçambique" (brand font) ----
const font = readFileSync(`${PUB}/fonts/bricolage-grotesque-700.woff2`).toString("base64");
const html = `<!doctype html><html><head><style>
@font-face{font-family:B;font-weight:700;src:url(data:font/woff2;base64,${font}) format("woff2")}
html,body{margin:0;width:1200px;height:630px;background:${C.sand}}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px}
svg{width:620px;height:auto;display:block}
p{margin:0;font:700 60px/1 B;color:${C.deep};letter-spacing:-0.01em}
</style></head><body>${logoSvg()}<p>Descobre Moçambique</p></body></html>`;
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: "png" });
await browser.close();
writeFileSync(
  `${PUB}/og-image.png`,
  await sharp(shot).png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 }).toBuffer(),
);
console.log("ok");
