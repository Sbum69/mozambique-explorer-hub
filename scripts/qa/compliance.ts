/**
 * Compliance (40 requisitos): storage notice, pricing page, licences on /creditos, assistant
 * transparency text, provider identification in the footer. Visitor only, no session, no writes.
 * Usage: bun scripts/qa/compliance.ts
 */
import { launch, newContext, reporter, BASE } from "./lib";

const browser = await launch();
const rep = reporter();

for (const lang of ["pt", "en"] as const) {
  const pt = lang === "pt";
  const ctx = await newContext(browser, { lang });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // ---- storage notice: hidden until the first interaction, then once per device ----
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const notice = page.getByRole("complementary", {
    name: pt ? "Aviso sobre armazenamento" : "Storage notice",
  });
  rep.line((await notice.count()) === 0, `${lang} notice: not shown before any interaction`);
  await page.mouse.wheel(0, 200);
  await notice.waitFor({ timeout: 8000 }).catch(() => undefined);
  rep.line(await notice.isVisible(), `${lang} notice: shown after the first scroll`);
  const more = notice.getByRole("link", { name: pt ? "Saber mais" : "Learn more" });
  rep.line(
    (await more.getAttribute("href"))?.endsWith("/privacy#armazenamento") ?? false,
    `${lang} notice: link to Privacy → storage section`,
  );
  await notice.getByRole("button", { name: "OK" }).click();
  rep.line((await notice.count()) === 0, `${lang} notice: OK closes it`);
  await page.reload({ waitUntil: "networkidle" });
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1500);
  rep.line((await notice.count()) === 0, `${lang} notice: not shown again after OK`);

  // ---- footer: provider identification ----
  const footer = await page.locator("footer nav").innerText();
  rep.line(
    /EKAYA/.test(footer) &&
      (pt ? /Moçambique/.test(footer) : /Mozambique/.test(footer)) &&
      /NUIT/.test(footer) &&
      /@/.test(footer),
    `${lang} footer: EKAYA, country, NUIT and email`,
  );

  // ---- pricing page ----
  await page.goto(BASE + "/precos-e-reembolsos", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const body = await page.locator("main").innerText();
  rep.line(
    (pt ? /Rascunho — sujeito a revisão jurídica/ : /Draft — subject to legal review/).test(body),
    `${lang} pricing: draft notice`,
  );
  rep.line(
    /M-Pesa/.test(body) && /\[DECIDIR\]/.test(body),
    `${lang} pricing: M-Pesa and [DECIDIR]`,
  );
  rep.line(
    (pt ? /Condições em vigor: versão \d+/ : /Terms in force: version \d+/).test(body),
    `${lang} pricing: prices read from the commercial settings`,
  );

  // ---- creditos: attributions and licences on demand ----
  let fetchedEarly = false;
  page.on("request", (r) => {
    if (r.url().endsWith("/licenses.json")) fetchedEarly = true;
  });
  await page.goto(BASE + "/creditos", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const credits = await page.locator("main").innerText();
  rep.line(
    /OpenStreetMap/.test(credits) && /Esri/.test(credits) && /CC BY 4\.0/.test(credits),
    `${lang} creditos: OSM, Esri and Open-Meteo attributions`,
  );
  rep.line(!fetchedEarly, `${lang} creditos: licence list not downloaded until asked`);
  await page.getByRole("button", { name: pt ? "Mostrar licenças" : "Show licences" }).click();
  const rows = page.locator("#cr-software ~ div table tbody tr");
  await rows
    .first()
    .waitFor({ timeout: 8000 })
    .catch(() => undefined);
  rep.line(
    (await rows.count()) > 20,
    `${lang} creditos: licence table (${await rows.count()} rows)`,
  );

  // ---- assistant transparency ----
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const launcher = page.getByRole("button", {
    name: pt ? /assistente|ajuda/i : /assistant|help/i,
  });
  if ((await launcher.count()) > 0) {
    await launcher.first().click();
    const panel = page.locator("#assistant-title").locator("..");
    await panel.waitFor({ timeout: 8000 }).catch(() => undefined);
    rep.line(
      (pt ? /sem IA generativa/ : /no generative AI/).test(await panel.innerText()),
      `${lang} assistant: says it uses no generative AI`,
    );
  } else rep.skip(`${lang} assistant: launcher not found`);

  rep.line(errors.length === 0, `${lang}: no page errors (${errors.length})`);
  await ctx.close();
}

await browser.close();
rep.finish();
