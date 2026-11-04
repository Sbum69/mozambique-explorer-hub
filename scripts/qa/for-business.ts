/**
 * M9 — "Para negócios" page, footer link, sitemap.xml and robots.txt. Read-only: the form is only
 * submitted empty (client-side checks), so nothing is sent to the database.
 * Usage: bun scripts/qa/for-business.ts
 */
import { launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();

for (const lang of ["pt", "en"] as const) {
  const ctx = await newContext(browser, { lang });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/para-negocios", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  rep.line(
    (lang === "pt" ? /Grátis para começar/ : /Free to start/).test(body) &&
      (lang === "pt" ? /Perguntas frequentes/ : /Frequently asked questions/).test(body),
    `${lang}: value proposition and FAQ`,
  );
  rep.line(
    (lang === "pt" ? /Total descontado/ : /Total deducted/).test(body),
    `${lang}: commission card with the total deducted`,
  );
  rep.line(
    (lang === "pt"
      ? /Lugares ainda disponíveis|Já não há lugares|confirmar os lugares/
      : /Places still available|no Founding Partner places|confirm the places/
    ).test(body),
    `${lang}: Founding Partner places shown (or the error state before 0055)`,
  );
  await page
    .getByRole("button", { name: lang === "pt" ? "Enviar pedido" : "Send request" })
    .click();
  await page.waitForTimeout(500);
  const invalid = await page.locator('[aria-invalid="true"]').count();
  rep.line(invalid >= 4, `${lang}: empty form shows field errors (${invalid}), nothing sent`);
  const focused = await page.evaluate(() => document.activeElement?.id ?? "");
  rep.line(focused === "lead-businessName", `${lang}: focus moves to the first wrong field`);
  rep.line(
    (await page.locator("#lead-website").getAttribute("tabindex")) === "-1",
    `${lang}: honeypot out of the tab order`,
  );
  rep.line(errors.length === 0, `${lang}: no page errors (${errors.length})`);
  await ctx.close();
}

{
  const ctx = await newContext(browser, { lang: "pt" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  rep.line(
    (await page.locator('a[href="/para-negocios"]').count()) > 0,
    "home: footer links to /para-negocios",
  );
  await ctx.close();
}

const robots = await (await fetch(BASE + "/robots.txt")).text();
rep.line(
  /Disallow: \/admin/.test(robots) && /Sitemap: .*\/sitemap\.xml/.test(robots),
  "robots.txt",
);
const sm = await fetch(BASE + "/sitemap.xml");
const xml = await sm.text();
rep.line(
  /xml/.test(sm.headers.get("content-type") ?? "") &&
    xml.includes("/para-negocios</loc>") &&
    !xml.includes("/admin"),
  "sitemap.xml lists public pages only",
);

await browser.close();
rep.finish();
