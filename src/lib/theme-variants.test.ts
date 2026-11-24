import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME_VARIANT, themeVariant, variantAttribute } from "./theme-variant";

/** Tokens of the first CSS block whose selector is exactly `selector`. */
function tokens(css: string, selector: string): Record<string, string> {
  // The block may list more selectors after this one (e.g. the nested ".dark").
  const at = [css.indexOf(`${selector} {`), css.indexOf(`${selector},`)].filter((i) => i >= 0);
  const start = at.length ? Math.min(...at) : -1;
  if (start < 0) throw new Error(`missing block ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [
      m[1],
      m[2].toLowerCase(),
    ]),
  );
}

const luminance = (hex: string) => {
  const [r, g, b] = (hex.slice(1).match(/../g) ?? []).map((x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Text (AA 4.5:1): body text, secondary text, text on every filled button, links and error text.
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["destructive-foreground", "destructive"],
  ["primary", "background"],
  ["primary", "card"],
  ["destructive", "card"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];
// Controls and focus (AA 3:1): input outlines and the focus ring.
const UI_PAIRS: [string, string][] = [
  ["input", "background"],
  ["input", "card"],
  ["ring", "background"],
  ["ring", "card"],
];

const root = join(process.cwd(), "src");
const variants = [
  ["A", readFileSync(join(root, "themes/variant-a.css"), "utf8"), '[data-variant="a"]'],
  ["B", readFileSync(join(root, "themes/variant-b.css"), "utf8"), '[data-variant="b"]'],
] as const;

describe("theme variants (tokens only)", () => {
  it("keep the current look as the default", () => {
    expect(DEFAULT_THEME_VARIANT).toBe("default");
    expect(themeVariant(undefined)).toBe("default");
    expect(variantAttribute("default")).toBeUndefined();
  });

  it("switch with one value (VITE_THEME_VARIANT or the constant) and ignore anything else", () => {
    expect(themeVariant("a")).toBe("a");
    expect(themeVariant("b")).toBe("b");
    expect(themeVariant("c")).toBe("default");
    expect(variantAttribute("a")).toBe("a");
  });

  it("also apply the dark tokens inside elements forced dark (HomeCta)", () => {
    for (const [, css, attr] of variants) expect(css).toContain(`:root${attr} .dark {`);
  });

  it("are imported by the app stylesheet", () => {
    const css = readFileSync(join(root, "styles.css"), "utf8");
    expect(css).toContain('@import "./themes/variant-a.css"');
    expect(css).toContain('@import "./themes/variant-b.css"');
  });

  for (const [name, css, attr] of variants) {
    for (const mode of ["light", "dark"] as const) {
      const selector = mode === "light" ? `:root${attr}` : `:root${attr}.dark`;
      it(`variant ${name} ${mode}: AA contrast on the main pairs`, () => {
        const t = tokens(css, selector);
        const fails: string[] = [];
        for (const [fg, bg] of TEXT_PAIRS) {
          const c = contrast(t[fg], t[bg]);
          if (!(c >= 4.5)) fails.push(`${fg}/${bg} ${c.toFixed(2)}`);
        }
        for (const [fg, bg] of UI_PAIRS) {
          const c = contrast(t[fg], t[bg]);
          if (!(c >= 3)) fails.push(`${fg}/${bg} ${c.toFixed(2)}`);
        }
        expect(fails).toEqual([]);
      });

      it(`variant ${name} ${mode}: defines every colour token the app uses`, () => {
        const t = tokens(css, selector);
        const used = [...new Set([...TEXT_PAIRS, ...UI_PAIRS].flat())];
        expect(used.filter((k) => !t[k])).toEqual([]);
      });
    }
  }
});
