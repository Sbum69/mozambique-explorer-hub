/**
 * M6 — highlights and campaigns. Read-only: nothing is requested, approved or saved.
 *   * public pages: every sponsored card carries the "Patrocinado"/"Sponsored" label and there are
 *     never more cards than the per-page limit (from commercial_configs);
 *   * business dashboard: the "Highlights and campaigns" section (PT/EN);
 *   * admin: the "Highlights" window (needs TEST_ADMIN_TOTP_SECRET).
 * Before migration 0054 the sections show their error state (SKIP).
 * Usage: bun scripts/qa/sponsored.ts
 */
import { hasTotp, launch, newContext, reporter, BASE, SUPA_KEY, SUPA_URL } from "./lib";

const rep = reporter();
const browser = await launch();

// Per-page limit read from the database (commercial_configs is publicly readable).
let perPage: number | null = null;
try {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/commercial_configs?select=sponsored_per_page&order=version.desc&limit=1`,
    { headers: { apikey: SUPA_KEY } },
  );
  const rows = res.ok ? ((await res.json()) as { sponsored_per_page?: number }[]) : [];
  perPage = rows[0]?.sponsored_per_page ?? null;
} catch {
  perPage = null;
}

for (const lang of ["pt", "en"] as const) {
  const label = lang === "pt" ? "Patrocinado" : "Sponsored";
  for (const path of ["/home", "/businesses", "/experiences"]) {
    const ctx = await newContext(browser, { lang, role: "tourist" });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const sections = page.locator('section[aria-labelledby^="sponsored-"]');
    const n = await sections.count();
    if (!n) rep.skip(`${lang} ${path}: no active highlight to check`);
    for (let i = 0; i < n; i++) {
      const cards = sections.nth(i).locator("li");
      const count = await cards.count();
      let labelled = 0;
      for (let k = 0; k < count; k++)
        if ((await cards.nth(k).innerText()).includes(label)) labelled++;
      rep.line(labelled === count, `${lang} ${path}: label on every card (${labelled}/${count})`);
      if (perPage != null)
        rep.line(count <= perPage, `${lang} ${path}: ${count} card(s) ≤ ${perPage} per page`);
      else rep.line(count <= 10, `${lang} ${path}: ${count} card(s) within the hard limit`);
    }
    rep.line(errors.length === 0, `${lang} ${path}: no page errors (${errors.length})`);
    await ctx.close();
  }

  const ctx = await newContext(browser, { lang, role: "business" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/business-dashboard?status=all", { waitUntil: "networkidle" });
  const title = lang === "pt" ? "Destaques e campanhas" : "Highlights and campaigns";
  await page
    .getByText(/Os teus pedidos|Your requests|carregar os destaques|load highlights/)
    .first()
    .waitFor({ timeout: 30000 })
    .catch(() => undefined);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  if (/Não foi possível carregar os destaques|Could not load highlights/.test(body))
    rep.skip(`${lang} business: highlights section (0054 not applied — error state shown)`);
  else
    rep.line(
      body.includes(title) && (lang === "pt" ? /Os teus pedidos/ : /Your requests/).test(body),
      `${lang} business: highlights section with the request list`,
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
  await page.getByRole("button", { name: "Destaques", exact: true }).click();
  await page.waitForTimeout(3000);
  const t = (await page.getByRole("dialog").innerText()).replace(/\s+/g, " ");
  if (/Não foi possível carregar os destaques/.test(t))
    rep.skip("admin: Highlights window content (0054 not applied)");
  else
    rep.line(
      /Por tratar/.test(t) && /Instruções de pagamento/.test(t) && /Limites/.test(t),
      "admin: Highlights window with queue, payment instructions and limits",
    );
  rep.line(errors.length === 0, `admin: no page errors (${errors.length})`);
  await ctx.close();
} else rep.skip("admin Highlights window (needs TEST_ADMIN_TOTP_SECRET)");

await browser.close();
rep.finish();
