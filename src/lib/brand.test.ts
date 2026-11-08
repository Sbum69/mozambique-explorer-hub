import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BRAND_COLORS, logoSvg } from "./brand";

const pub = (f: string) => new URL(`../../public/${f}`, import.meta.url);

describe("brand: logo files and icons", () => {
  it("public SVG files match the logo drawn in brand.ts", () => {
    const attrs = 'role="img" aria-label="EKAYA"';
    expect(readFileSync(pub("logo.svg"), "utf8").trim()).toBe(logoSvg({ attrs }));
    expect(readFileSync(pub("logo-dark.svg"), "utf8").trim()).toBe(logoSvg({ dark: true, attrs }));
    expect(readFileSync(pub("logo-mark.svg"), "utf8").trim()).toBe(logoSvg({ mark: true, attrs }));
    expect(readFileSync(pub("favicon.svg"), "utf8").trim()).toBe(logoSvg({ mark: true }));
  });

  it("light logo in deep green, dark logo in sand with a white outline on the heart", () => {
    const light = logoSvg();
    const dark = logoSvg({ dark: true });
    expect(light).toContain(`fill="${BRAND_COLORS.deep}"`);
    expect(light).not.toContain('stroke="#fff"');
    expect(dark).toContain(`fill="${BRAND_COLORS.sand}"`);
    expect(dark).toContain('stroke="#fff"');
    for (const c of [BRAND_COLORS.green, BRAND_COLORS.yellow, BRAND_COLORS.red])
      expect(light).toContain(c);
  });

  it("16 px favicon uses a solid red heart", () => {
    const solid = logoSvg({ mark: true, solidHeart: true });
    expect(solid).toContain(BRAND_COLORS.red);
    expect(solid).not.toContain(BRAND_COLORS.green);
    expect(solid).not.toContain(BRAND_COLORS.yellow);
  });

  it("favicon.ico holds 16 and 32 px images", () => {
    const ico = readFileSync(pub("favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect([ico[6], ico[22]]).toEqual([16, 32]);
  });

  it("web manifest: name, colours and icons", () => {
    const m = JSON.parse(readFileSync(pub("site.webmanifest"), "utf8"));
    expect(m.name).toBe("EKAYA");
    expect(m.theme_color).toBe(BRAND_COLORS.deep);
    expect(m.background_color).toBe(BRAND_COLORS.sand);
    const icons = m.icons.map((i: { src: string }) => i.src);
    expect(icons).toEqual(["/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"]);
    expect(m.icons[2].purpose).toBe("maskable");
  });

  it("theme-color in the page head is the logo's deep green", () => {
    const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
    expect(root).toContain(`{ name: "theme-color", content: "${BRAND_COLORS.deep}" }`);
  });

  it("icons stay small", () => {
    for (const [f, max] of [
      ["favicon.ico", 3_000],
      ["icon-192.png", 6_000],
      ["icon-512.png", 12_000],
      ["icon-maskable-512.png", 12_000],
      ["apple-touch-icon.png", 6_000],
      ["og-image.png", 40_000],
    ] as const)
      expect(readFileSync(pub(f)).length).toBeLessThan(max);
  });
});
