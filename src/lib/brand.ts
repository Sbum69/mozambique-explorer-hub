/**
 * "Coração do Índico" logo: EKAYA in bold geometric capitals, drawn as shapes (no font). The last A
 * has no bar; a small heart sits in its place, green and yellow lobes with a red point (the three
 * most visible colours of the flag; never the flag or the emblem themselves).
 * Only the logo and the icons use these colours: the app palette stays in styles.css.
 * The same paths feed the React logo (BrandLogo) and the files in public/ (logo*.svg, icons).
 */
export const BRAND_COLORS = {
  deep: "#0E4B3B", // letters on light backgrounds
  sand: "#F4EEE2", // letters on dark backgrounds
  night: "#12201B", // dark background of the logo samples
  green: "#009739",
  yellow: "#FCD116",
  red: "#D21034",
} as const;

/** Cap height 100. E, K, A (with bar, even-odd counter) and Y. */
export const LOGO_LETTERS =
  "M0 0H60V20H22V40H54V60H22V80H60V100H0Z" +
  "M70 0H92V39L120 0H147L112 47L149 100H122L92 57V100H70Z" +
  "M155 100L186 0H210L241 100H217L212.04 84H183.96L179 100ZM189.54 66H206.46L198 38.7Z" +
  "M245 0H270L285 35L300 0H325L296 60V100H274V60Z";

/** The last A: no bar. */
export const LOGO_LAST_A = "M327 100L358 0H382L413 100H389L370 38.7L351 100Z";

/** Heart in the counter of the last A: two lobes (r 5.8) and the point, close to the baseline. */
export const LOGO_HEART =
  "M370 96L360.07 84.25A5.8 5.8 0 1 1 370 78.66A5.8 5.8 0 1 1 379.93 84.25Z";
export const LOGO_LOBES = { r: 5.8, cy: 80.5, left: 364.5, right: 375.5 } as const;

export const LOGO_VIEWBOX = "0 0 413 100";
/** Just the last A with the heart, centred in a square. */
export const MARK_VIEWBOX = "320 0 100 100";

type SvgOptions = {
  /** Letters in sand and a thin white outline around the heart (dark backgrounds). */
  dark?: boolean;
  /** Only the last A with the heart. */
  mark?: boolean;
  /** Solid red heart: at 16 px three colours in 4 pixels become a smudge. */
  solidHeart?: boolean;
  /** Extra attributes for the root <svg> (size, title). */
  attrs?: string;
};

/** Heart markup shared by the files and the icons. */
export function heartSvg({ dark = false, solid = false } = {}): string {
  const c = BRAND_COLORS;
  const outline = dark
    ? `<path d="${LOGO_HEART}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`
    : "";
  if (solid) return `${outline}<path d="${LOGO_HEART}" fill="${c.red}"/>`;
  const { r, cy, left, right } = LOGO_LOBES;
  return (
    outline +
    `<path d="${LOGO_HEART}" fill="${c.red}"/>` +
    `<circle cx="${left}" cy="${cy}" r="${r}" fill="${c.green}"/>` +
    `<circle cx="${right}" cy="${cy}" r="${r}" fill="${c.yellow}"/>`
  );
}

/** Standalone SVG document (public/logo.svg, logo-dark.svg, logo-mark.svg, favicon.svg). */
export function logoSvg({
  dark = false,
  mark = false,
  solidHeart = false,
  attrs = "",
}: SvgOptions = {}): string {
  const fill = dark ? BRAND_COLORS.sand : BRAND_COLORS.deep;
  const letters = mark ? "" : `<path d="${LOGO_LETTERS}" fill="${fill}" fill-rule="evenodd"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark ? MARK_VIEWBOX : LOGO_VIEWBOX}"${attrs ? " " + attrs : ""}>` +
    letters +
    `<path d="${LOGO_LAST_A}" fill="${fill}"/>` +
    heartSvg({ dark, solid: solidHeart }) +
    `</svg>`
  );
}
