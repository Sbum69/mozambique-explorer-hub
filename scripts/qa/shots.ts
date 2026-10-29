/**
 * Screenshots for visual review: light and dark, 1280 px and 390 px (phone emulation).
 * Usage: bun scripts/qa/shots.ts [--pages=home,map] [--lang=en] [--full]
 * Output: qa-output/shots/<page>-<theme>-<width>[-en].png. Review by eye (no automatic PASS).
 */
import { join } from "node:path";

import { launch, newContext, outDir, selectedPages, BASE, type Lang, type Theme } from "./lib";

const lang = (process.argv.find((a) => a.startsWith("--lang="))?.slice(7) ?? "pt") as Lang;
const full = process.argv.includes("--full");
const dir = outDir("shots");

const browser = await launch();
for (const width of [1280, 390]) {
  for (const p of selectedPages()) {
    for (const theme of ["light", "dark"] as Theme[]) {
      const ctx = await newContext(browser, { width, theme, lang, role: p.role });
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
        await page.waitForTimeout(3000);
        const file = join(dir, `${p.name}-${theme}-${width}${lang === "en" ? "-en" : ""}.png`);
        await page.screenshot({ path: file, fullPage: full });
        console.log(`OK ${file}`);
      } catch (e) {
        console.log(`FAIL ${p.name} ${theme} ${width}: ${(e as Error).message.split("\n")[0]}`);
      }
      await ctx.close();
    }
  }
}
await browser.close();
