/**
 * CONTEÚDO-1 — empty states, owner invite page, admin Content window and business panel checklist.
 * Read-only: nothing is imported, activated or claimed. Cases that need migration 0051 report SKIP
 * while it is not applied.
 * Usage: bun scripts/qa/content.ts
 */
import { hasTotp, launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();
const text = async (p: import("playwright").Page) =>
  (await p.locator("body").innerText()).replace(/\s+/g, " ");

for (const lang of ["pt", "en"] as const) {
  const ctx = await newContext(browser, { lang });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE + "/experiences", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const join = page.getByRole("link", { name: lang === "pt" ? "Junta-te ao EKAYA" : "Join EKAYA" });
  rep.line(
    (await join.count()) >= 1 &&
      (lang === "pt" ? /És um negócio local\?/ : /Are you a local business\?/).test(
        await text(page),
      ),
    `${lang} /experiences: empty state with the join invitation`,
  );

  await page.goto(BASE + "/convite/0000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  rep.line(
    (lang === "pt"
      ? /Entra ou cria conta para aceitar o convite/
      : /Sign in or create an account/
    ).test(await text(page)),
    `${lang} /convite (guest): asks to sign in`,
  );
  rep.line(errors.length === 0, `${lang}: no page errors (${errors.length})`);
  await ctx.close();
}

// Signed-in tourist with an invalid invite: clear message, nothing claimed.
{
  const ctx = await newContext(browser, { lang: "pt", role: "tourist" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/convite/0000", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const t = await text(page);
  if (/Could not find the function|PGRST202/.test(t))
    rep.skip("tourist invalid invite (0051 not applied)");
  else
    rep.line(
      /Este convite já foi usado, expirou ou não existe/.test(t),
      "tourist: invalid invite explains what to do",
    );
  await ctx.close();
}

// Admin (aal2): the Content window opens with the import and the ready-to-publish list.
if (hasTotp("admin")) {
  const ctx = await newContext(browser, { lang: "pt", role: "admin" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Conteúdo e importação" }).click();
  await page.waitForTimeout(2500);
  const dialog = page.getByRole("dialog");
  const t = (await dialog.innerText()).replace(/\s+/g, " ");
  rep.line(
    /Importar negócios e atividades/.test(t) &&
      /Pronto para publicar/.test(t) &&
      /Negócios aprovados/.test(t),
    "admin: Content window with summary, import and ready-to-publish",
  );
  rep.line(
    (await dialog.getByRole("button", { name: "Descarregar modelo CSV" }).count()) === 1,
    "admin: CSV template download",
  );
  rep.line(errors.length === 0, `admin: no page errors (${errors.length})`);
  await ctx.close();
} else rep.skip("admin Content window (needs TEST_ADMIN_TOTP_SECRET)");

// Business owner: the ready-to-publish section is on the dashboard.
{
  const ctx = await newContext(browser, { lang: "pt", role: "business" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/business-dashboard?status=all", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const sec = page.locator("#business-ready");
  const t = (await sec.innerText().catch(() => "")).replace(/\s+/g, " ");
  if (!t) rep.line(false, "business: ready-to-publish section present");
  else if (/Não foi possível carregar o conteúdo/.test(t))
    rep.skip("business: checklist content (0051 not applied — section shows the error state)");
  else
    rep.line(/Negócio/.test(t) && /(Pronto|Falta completar)/.test(t), "business: checklist shown");
  rep.line(
    (await sec.getByRole("button", { name: "Fotos" }).count()) >= 1,
    "business: photos button",
  );
  await ctx.close();
}

await browser.close();
rep.finish();
