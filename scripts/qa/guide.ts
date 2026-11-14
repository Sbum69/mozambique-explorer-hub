/**
 * End-to-end: first-entry guide of the traveller panel (0068).
 *   1. Browser A, first entry: the guide opens by itself on /dashboard.
 *   2. "Não voltar a mostrar" saves the outcome on the account (set_my_guide answers OK).
 *   3. Browser B (a new context, its own session): the guide does not open again.
 *   4. Help → "Ver o guia outra vez" opens it again (closed without choosing, so nothing is saved).
 * Usage: QA_BASE=http://127.0.0.1:4174 bun scripts/qa/guide.ts
 * Writes ONE value on the tourist test account (profiles.guide_tourist = 'dismissed'); it only works
 * once per account, since the guide no longer opens by itself afterwards.
 */
import { BASE, launch, newContext } from "./lib";

const browser = await launch();
let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
};

// 1–2. Browser A
{
  const ctx = await newContext(browser, { width: 390, role: "tourist", lang: "pt" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/dashboard", { waitUntil: "load", timeout: 45000 });
  const dialog = page.getByRole("dialog", { name: "Escolhe as tuas preferências" });
  const opened = await dialog
    .waitFor({ state: "visible", timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check(opened, "1. primeira entrada: o guia abre sozinho no painel (passo 1)");
  if (opened) {
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    check(focused === "Seguinte", `   foco no botão principal (${focused})`);
    const saved = page.waitForResponse((r) => r.url().includes("/rpc/set_my_guide"), {
      timeout: 15000,
    });
    await dialog.getByRole("button", { name: "Não voltar a mostrar" }).click();
    const res = await saved.catch(() => null);
    check(!!res && res.ok(), `2. "Não voltar a mostrar" grava na conta (HTTP ${res?.status()})`);
    check(!(await dialog.isVisible()), "   o guia fecha");
  }
  await ctx.close();
}

// 3–4. Browser B: a new context with its own session (nothing shared with A)
{
  const ctx = await newContext(browser, { width: 1280, role: "tourist", lang: "pt" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/dashboard", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(8000);
  const shown = await page
    .getByRole("dialog", { name: "Escolhe as tuas preferências" })
    .isVisible();
  check(!shown, "3. noutro browser o guia já não abre");

  await page.getByRole("button", { name: "Ajuda" }).click();
  await page.getByRole("button", { name: "Ver o guia outra vez" }).click();
  const again = await page
    .getByRole("dialog", { name: "Escolhe as tuas preferências" })
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check(again, '4. Ajuda → "Ver o guia outra vez" abre-o de novo');
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nall PASS");
process.exit(failures ? 1 : 0);
