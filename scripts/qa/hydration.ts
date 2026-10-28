/**
 * Hydration errors on the server-rendered pages: guest and tourist, PT and EN.
 * Usage: bun scripts/qa/hydration.ts [--pages=home,map]
 * PASS = no React hydration error (#418/#419/#421-#425, "did not match") and no page error.
 */
import { launch, newContext, reporter, selectedPages, BASE, type Lang, type QaPage } from "./lib";

const SSR_PAGES: QaPage[] = [
  { name: "home", path: "/home" },
  { name: "experiences", path: "/experiences" },
  { name: "community", path: "/community" },
  { name: "map", path: "/map" },
  { name: "useful-info", path: "/useful-info" },
  { name: "itineraries", path: "/itineraries" },
];
const HYDRATION = /hydrat|did not match|Minified React error #4(18|19|21|22|23|25)/i;

const browser = await launch();
const out = reporter();
for (const who of ["guest", "tourist"] as const) {
  for (const lang of ["pt", "en"] as Lang[]) {
    const ctx = await newContext(browser, {
      width: 390,
      lang,
      role: who === "tourist" ? "tourist" : undefined,
    });
    for (const p of selectedPages(SSR_PAGES)) {
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && HYDRATION.test(m.text())) errors.push(m.text().slice(0, 160));
      });
      page.on("pageerror", (e) => errors.push("pageerror " + e.message.slice(0, 160)));
      // The map keeps loading tiles: "load" plus a pause is enough to see hydration finish.
      await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(2500);
      const heading = await page
        .locator("h1, h2")
        .first()
        .innerText()
        .catch(() => "?");
      out.line(
        errors.length === 0,
        `${who}/${lang} ${p.path} | ${heading.slice(0, 40).replace(/\n/g, " ")}${errors.length ? " | " + errors.join(" || ") : ""}`,
      );
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
out.finish();
