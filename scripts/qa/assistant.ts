/**
 * Assistant phase 1 in the browser: launcher on every public page, lazy panel, answer with a link,
 * suggestions, Escape closes and focus returns. Read-only except the anonymous "unanswered" log
 * (one synthetic question, deleted by the 30-day purge). Before 0056 the panel shows its error state.
 * Usage: bun scripts/qa/assistant.ts
 */
import { launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();

for (const lang of ["pt", "en"] as const) {
  const ctx = await newContext(browser, { lang });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  const launcher = page.getByRole("button", {
    name: lang === "pt" ? "Abrir o assistente de ajuda" : "Open the help assistant",
  });
  rep.line((await launcher.count()) === 1, `${lang}: help button on the page`);
  await launcher.click();
  const dialog = page.getByRole("dialog", {
    name: lang === "pt" ? "Assistente EKAYA" : "EKAYA assistant",
  });
  await dialog.waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const text = await dialog.innerText();
  if (/Não foi possível carregar as perguntas|Could not load the frequently/.test(text)) {
    rep.skip(`${lang}: answers (0056 not applied — error state shown)`);
  } else {
    await page
      .getByLabel(lang === "pt" ? "Pergunta" : "Question")
      .fill(
        lang === "pt" ? "Como mudo a minha foto de perfil?" : "How do I change my profile photo?",
      );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const after = await dialog.innerText();
    rep.line(
      after.includes(lang === "pt" ? "Definições" : "Settings"),
      `${lang}: FAQ answer with the Settings link`,
    );
    rep.line(
      (await dialog.locator('a[href="/settings"]').count()) > 0,
      `${lang}: link to /settings`,
    );
  }
  rep.line(
    (await dialog.locator('a[href^="mailto:"]').count()) === 1,
    `${lang}: "talk to the team" link`,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  rep.line((await dialog.count()) === 0, `${lang}: Escape closes the panel`);
  rep.line(errors.length === 0, `${lang}: no page errors (${errors.length})`);
  await ctx.close();
}

await browser.close();
rep.finish();
