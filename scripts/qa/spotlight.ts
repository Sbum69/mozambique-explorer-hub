/**
 * Home actions spotlight: 5 s without scrolling in the plan / destinations zone highlights
 * "Ver recomendações" and "Explorar a app" once per visit; the next scroll returns them to normal.
 * Read-only (navigates and scrolls). Usage: bun scripts/qa/spotlight.ts
 * PASS = spotlight after 5 s (not before), ring + one rise/glow (none with reduced motion), bar
 * reachable by keyboard and announced politely, removed on scroll, never again in the visit
 * (also after a reload), no layout shift while it happens, PT and EN.
 */
import type { Page } from "playwright";

import { launch, newContext, outDir, reporter, BASE, type Lang } from "./lib";

const rep = reporter();
const out = outDir("spotlight");
const browser = await launch();

const TEXT: Record<Lang, string> = {
  pt: "Atalhos no fundo do ecrã: Ver recomendações e Explorar a app.",
  en: "Shortcuts at the bottom of the screen: Recommendations and Open the app.",
};

async function state(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>("nav.home-cta")!;
    const btn = nav.querySelector<HTMLElement>(".home-cta-btn")!;
    const live = nav.previousElementSibling as HTMLElement | null;
    return {
      spot: nav.hasAttribute("data-spotlight"),
      hidden: nav.hasAttribute("data-hidden"),
      inert: nav.inert,
      ring: getComputedStyle(btn).boxShadow,
      animations: [...nav.querySelectorAll(".home-cta-btn")].flatMap((b) => b.getAnimations())
        .length,
      live: live?.getAttribute("aria-live") === "polite" ? (live.textContent ?? "") : null,
    };
  });
}

/** Layout shifts (CLS entries) since the last call. */
async function shifts(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as unknown as { __cls: number };
    const v = w.__cls;
    w.__cls = 0;
    return v;
  });
}

async function scrollTo(page: Page, id: string) {
  await page.evaluate((target) => {
    document.getElementById(target)!.scrollIntoView({ behavior: "instant", block: "center" });
  }, id);
  await page.waitForTimeout(400);
}

const cases: { width: number; lang: Lang; reduce: boolean; zone: string }[] = [
  { width: 390, lang: "pt", reduce: false, zone: "home-plan" },
  { width: 1280, lang: "pt", reduce: false, zone: "home-rail" },
  { width: 390, lang: "en", reduce: false, zone: "home-rail" },
  { width: 1280, lang: "en", reduce: false, zone: "home-plan" },
  { width: 1280, lang: "pt", reduce: true, zone: "home-plan" },
  { width: 390, lang: "pt", reduce: true, zone: "home-rail" },
];

for (const c of cases) {
  const tag = `${c.width}px ${c.lang}${c.reduce ? " reduced-motion" : ""} ${c.zone}`;
  const ctx = await newContext(browser, { width: c.width, lang: c.lang });
  await ctx.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[])
        if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  const page = await ctx.newPage();
  if (c.reduce) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  await scrollTo(page, c.zone);
  await shifts(page);

  await page.waitForTimeout(4000);
  rep.line(!(await state(page)).spot, `${tag}: no spotlight before 5 s`);
  await page.waitForTimeout(1600);
  const on = await state(page);
  rep.line(on.spot && !on.hidden && !on.inert, `${tag}: spotlight after 5 s, bar shown`);
  rep.line(on.ring.includes("rgb(240, 180, 74)"), `${tag}: ochre ring (highlight) — ${on.ring}`);
  rep.line(
    c.reduce ? on.animations === 0 : on.animations > 0,
    `${tag}: ${c.reduce ? "no animation" : "one rise + glow running"} (${on.animations})`,
  );
  rep.line(on.live === TEXT[c.lang], `${tag}: polite announcement "${on.live}"`);
  await page.screenshot({ path: `${out}/${c.width}-${c.lang}${c.reduce ? "-reduce" : ""}.png` });

  // Keyboard: the highlighted buttons are reachable (Tab order) and keep a visible focus.
  await page.locator("nav.home-cta .home-cta-btn").first().focus();
  const focused = await page.evaluate(() =>
    document.activeElement?.classList.contains("home-cta-btn"),
  );
  rep.line(!!focused, `${tag}: keyboard focus reaches the buttons`);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await page.waitForTimeout(1500);
  const after = await state(page);
  rep.line(after.animations === 0, `${tag}: no continuous animation (${after.animations} left)`);
  const cls = await shifts(page);
  rep.line(cls === 0, `${tag}: layout shift during spotlight = ${cls}`);

  await page.mouse.wheel(0, 60);
  await page.waitForTimeout(400);
  const off = await state(page);
  rep.line(!off.spot && off.live === "", `${tag}: next scroll → normal state`);

  await page.waitForTimeout(6000);
  rep.line(!(await state(page)).spot, `${tag}: not again in the same visit`);
  await page.reload({ waitUntil: "networkidle" });
  await scrollTo(page, c.zone);
  await page.waitForTimeout(6000);
  rep.line(!(await state(page)).spot, `${tag}: not again after a reload (same visit)`);
  await ctx.close();
}

await browser.close();
rep.finish();
