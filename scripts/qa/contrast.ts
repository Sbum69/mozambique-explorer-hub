/**
 * WCAG AA colour contrast (axe-core "color-contrast") per page, light and dark, at 1280 px.
 * Usage: bun scripts/qa/contrast.ts [--pages=home,map]
 * PASS = 0 contrast violations on the page in that theme.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { launch, newContext, outDir, reporter, selectedPages, BASE, type Theme } from "./lib";

const AXE = join(import.meta.dir, "node_modules/axe-core/axe.min.js");

const browser = await launch();
const out = reporter();
const results: Record<string, string[]> = {};
for (const p of selectedPages()) {
  for (const theme of ["light", "dark"] as Theme[]) {
    const ctx = await newContext(browser, { width: 1280, theme, role: p.role });
    const page = await ctx.newPage();
    await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.addScriptTag({ path: AXE });
    const violations = (await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (...a: unknown[]) => Promise<unknown> } })
        .axe;
      const res = (await axe.run(document, {
        runOnly: ["color-contrast"],
        resultTypes: ["violations"],
      })) as { violations: { nodes: { target: string[]; any: { message: string }[] }[] }[] };
      return res.violations.flatMap((v) =>
        v.nodes.map((n) => `${n.target.join(" ")} :: ${n.any[0]?.message ?? ""}`.slice(0, 200)),
      );
    })) as string[];
    results[`${p.name}/${theme}`] = violations;
    out.line(
      violations.length === 0,
      `${p.name}/${theme}${violations.length ? ` ${violations.length}: ${violations.slice(0, 2).join(" | ")}` : ""}`,
    );
    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(outDir("contrast"), "contrast.json"), JSON.stringify(results, null, 2));
out.finish();
