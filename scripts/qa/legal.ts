/**
 * LEGAL-1 — Terms and Privacy pages, the sign-up acceptance box, the legal footer and the
 * acceptance prompt. Read-only: the sign-up form is only submitted empty (client validation,
 * nothing reaches the server) and the prompt is never accepted.
 * Usage: bun scripts/qa/legal.ts
 */
import { launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();
const text = async (p: import("playwright").Page) =>
  (await p.locator("body").innerText()).replace(/\s+/g, " ");

for (const lang of ["pt", "en"] as const) {
  const ctx = await newContext(browser, { lang });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  for (const [path, title, draft] of [
    [
      "/terms",
      lang === "pt" ? "Termos de Utilização" : "Terms of Use",
      lang === "pt" ? "Rascunho — sujeito a revisão jurídica" : "Draft — subject to legal review",
    ],
    [
      "/privacy",
      lang === "pt" ? "Política de Privacidade" : "Privacy Policy",
      lang === "pt" ? "Rascunho — sujeito a revisão jurídica" : "Draft — subject to legal review",
    ],
  ] as const) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const t = await text(page);
    const sections = await page.locator("main section h2").count();
    rep.line(
      t.includes(title) &&
        t.includes(draft) &&
        sections >= 10 &&
        t.includes("sheldonesmad@gmail.com"),
      `${lang} ${path}: title, draft notice, ${sections} sections, contact email`,
    );
    rep.line(!/\[[^\]]*\]|undefined/.test(t), `${lang} ${path}: no placeholders`);
  }

  await page.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const box = page.locator("#accept-legal");
  rep.line(
    (await box.count()) === 1 && (await box.getAttribute("aria-checked")) === "false",
    `${lang} signup: acceptance box, unchecked`,
  );
  const terms = page.getByRole("link", {
    name: lang === "pt" ? "Termos de Utilização" : "Terms of Use",
  });
  rep.line(
    (await terms.getAttribute("target")) === "_blank",
    `${lang} signup: Terms link opens in a new tab`,
  );
  await page
    .getByRole("button", { name: lang === "pt" ? "Criar Conta" : "Create Account" })
    .click();
  await page.waitForTimeout(500);
  rep.line(
    await page.locator("#accept-legal-error").isVisible(),
    `${lang} signup: empty submit shows the acceptance error (client side)`,
  );

  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const footer = page.locator("footer nav");
  rep.line(
    (await footer.getByRole("link").count()) === 4 &&
      /v\d+\.\d+\.\d+/.test(await footer.innerText()),
    `${lang} home: footer with For businesses, 3 legal links and version`,
  );
  rep.line(errors.length === 0, `${lang}: no page errors (${errors.length})`);
  await ctx.close();
}

// Signed-in test tourist: the 3 test accounts accepted the 2026-10-30 versions (approved 30/10),
// so no prompt appears. The prompt itself (shown, Escape-proof, /terms readable) was checked on
// 30/10 before that acceptance; recheck it with an account that has not accepted the versions in force.
{
  const ctx = await newContext(browser, { lang: "pt", role: "tourist" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  rep.line(
    (await page.getByRole("alertdialog").count()) === 0,
    "tourist (accepted): no acceptance prompt on /home",
  );
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  rep.line(
    (await page.locator('a[href="mailto:sheldonesmad@gmail.com"]').count()) === 1,
    "tourist: settings show the contact email",
  );
  await ctx.close();
}

await browser.close();
rep.finish();
