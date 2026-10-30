/**
 * SEG-2 — two-step verification in the app (read-only: nothing is enrolled or verified).
 * Usage: bun scripts/qa/mfa.ts
 */
import { launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();

for (const lang of ["pt", "en"] as const) {
  const ctx = await newContext(browser, { lang, role: "tourist" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const sec = page.locator("#security");
  const text = (await sec.innerText()).replace(/\s+/g, " ");
  rep.line(
    (lang === "pt" ? /Segurança/ : /Security/).test(text) &&
      (lang === "pt" ? /desativada/ : /is off/).test(text),
    `${lang} tourist: Settings → Security shows 2FA off`,
  );
  rep.line(
    (await sec
      .getByRole("button", { name: lang === "pt" ? /Ativar verificação/ : /Turn on two-step/ })
      .count()) === 1,
    `${lang} tourist: button to turn 2FA on`,
  );
  rep.line(
    (await page.getByRole("alertdialog").count()) === 0,
    `${lang} tourist: no code prompt (no factor)`,
  );
  rep.line(errors.length === 0, `${lang} tourist: no page errors (${errors.length})`);
  await ctx.close();
}

// Admin without an aal2 session: the administration area sends them to Settings → Security.
{
  const ctx = await newContext(browser, { lang: "pt", role: "admin" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const url = new URL(page.url());
  rep.line(
    url.pathname === "/settings" &&
      url.searchParams.get("mfa") === "required" &&
      url.hash === "#security",
    `admin (aal1): /admin redirects to ${url.pathname}${url.search}${url.hash}`,
  );
  rep.line(
    /A administração exige a verificação em dois passos/.test(
      await page.locator("#security").innerText(),
    ),
    "admin (aal1): Security section explains the requirement",
  );
  await ctx.close();
}

await browser.close();
rep.finish();
