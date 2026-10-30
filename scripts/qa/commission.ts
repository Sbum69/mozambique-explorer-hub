/**
 * M1 — "Commission and fees" card (business dashboard) and the admin window "Commission and prices".
 * Read-only: nothing is saved. Before migration 0053 the card must show its error state (SKIP).
 * Usage: bun scripts/qa/commission.ts
 */
import { hasTotp, launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();

for (const lang of ["pt", "en"] as const) {
  const ctx = await newContext(browser, { lang, role: "business" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/business-dashboard?status=all", { waitUntil: "networkidle" });
  // The query retries before it gives up: wait for the content or for the error state.
  await page
    .getByText(/Total descontado|Total deducted|condições comerciais|commercial terms/)
    .first()
    .waitFor({ timeout: 30000 })
    .catch(() => undefined);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const title = lang === "pt" ? "Comissão e taxas" : "Commission and fees";
  if (
    /Não foi possível carregar as condições comerciais|Could not load the commercial terms/.test(
      body,
    )
  )
    rep.skip(`${lang} business: card content (0053 not applied — error state shown)`);
  else
    rep.line(
      body.includes(title) &&
        (lang === "pt" ? /Total descontado/ : /Total deducted/).test(body) &&
        (lang === "pt" ? /Recebes/ : /You receive/).test(body),
      `${lang} business: card with commission, provider fee, total deducted and net`,
    );
  rep.line(errors.length === 0, `${lang} business: no page errors (${errors.length})`);
  await ctx.close();
}

if (hasTotp("admin")) {
  const ctx = await newContext(browser, { lang: "pt", role: "admin" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Comissão e preços" }).click();
  await page.waitForTimeout(2500);
  const t = (await page.getByRole("dialog").innerText()).replace(/\s+/g, " ");
  if (/Não foi possível carregar as condições comerciais/.test(t))
    rep.skip("admin: Commission window content (0053 not applied)");
  else
    rep.line(
      /Em vigor: versão \d+/.test(t) &&
        /Parceiros Fundadores/.test(t) &&
        /Registo de alterações/.test(t),
      "admin: Commission window with version, Founders and change log",
    );
  rep.line(errors.length === 0, `admin: no page errors (${errors.length})`);
  await ctx.close();
} else rep.skip("admin Commission window (needs TEST_ADMIN_TOTP_SECRET)");

await browser.close();
rep.finish();
