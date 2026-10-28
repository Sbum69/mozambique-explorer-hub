/**
 * Nothing cut off or wider than the screen, from phones to desktop (phone emulation below 768 px).
 * Usage: bun scripts/qa/widths.ts [--pages=home,map] [--widths=320,390,1280]
 * PASS = no horizontal scroll and no text/button pushed past the right edge (also when the page
 * hides it with overflow: hidden, which is what looks "cut" on a phone).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { launch, newContext, outDir, reporter, selectedPages, BASE } from "./lib";

const widthsArg = process.argv.find((a) => a.startsWith("--widths="));
const WIDTHS = (
  widthsArg?.slice("--widths=".length) ?? "320,360,375,390,412,430,768,1024,1280,1440"
)
  .split(",")
  .map(Number);

type Hit = { kind: "overflow" | "clipped"; right: number; where: string; text: string };

const browser = await launch();
const out = reporter();
const rows: { page: string; width: number; scrollW: number; view: number; hits: Hit[] }[] = [];
for (const p of selectedPages()) {
  for (const width of WIDTHS) {
    const ctx = await newContext(browser, { width, role: p.role });
    const page = await ctx.newPage();
    await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const view = Math.min(de.clientWidth, window.visualViewport?.width ?? de.clientWidth);
      const describe = (el: Element) => {
        const chain: string[] = [];
        let a: Element | null = el;
        for (let i = 0; a && i < 3; i++, a = a.parentElement)
          chain.unshift(a.tagName.toLowerCase());
        const cls = (el.getAttribute("class") ?? "").split(/\s+/).slice(0, 5).join(".");
        return chain.join(">") + (cls ? "." + cls : "");
      };
      const meaningful = (el: Element) =>
        (el.textContent ?? "").trim().length > 0 ||
        /^(BUTTON|A|INPUT|SELECT|TEXTAREA|IMG|svg)$/i.test(el.tagName);
      const hits: Hit[] = [];
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.visibility === "hidden" || cs.display === "none")
          continue;
        if (
          el.closest(
            '[aria-hidden="true"], .leaflet-container, [data-radix-popper-content-wrapper]',
          )
        )
          continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2 || rect.right <= view + 1 || !meaningful(el))
          continue;
        let clipper: Element | null = el.parentElement;
        while (
          clipper &&
          clipper !== document.body &&
          getComputedStyle(clipper).overflowX === "visible"
        )
          clipper = clipper.parentElement;
        const parent = el.parentElement;
        if (clipper && clipper !== document.body) {
          const ox = getComputedStyle(clipper).overflowX;
          if (ox === "auto" || ox === "scroll") continue; // horizontal scrollers are intended
          if (clipper.getBoundingClientRect().right <= view + 1) {
            if (
              parent &&
              parent !== clipper &&
              parent.getBoundingClientRect().right > view + 1 &&
              meaningful(parent)
            )
              continue;
            hits.push({
              kind: "clipped",
              right: Math.round(rect.right),
              where: describe(el),
              text: (el.textContent ?? "").trim().slice(0, 40),
            });
            continue;
          }
        }
        if (parent && parent !== document.body && parent.getBoundingClientRect().right > view + 1)
          continue;
        hits.push({
          kind: "overflow",
          right: Math.round(rect.right),
          where: describe(el),
          text: (el.textContent ?? "").trim().slice(0, 40),
        });
      }
      return { view: Math.round(view), scrollW: de.scrollWidth, hits: hits.slice(0, 8) };
    });
    rows.push({ page: p.name, width, ...r });
    const ok = r.scrollW <= r.view + 1 && r.hits.length === 0;
    out.line(
      ok,
      `${p.name} @${width}${ok ? "" : ` scroll ${r.scrollW}/${r.view} ` + r.hits.map((h) => `[${h.kind} right=${h.right} ${h.where} "${h.text}"]`).join(" ")}`,
    );
    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(outDir("widths"), "widths.json"), JSON.stringify(rows, null, 2));
out.finish();
