/**
 * QA-2 — one journey per test account, read-only (navigates and reads; never submits a form).
 * Writes (booking, favourite, proof, game, reward, voucher, approve/suspend) are covered by the
 * self-reverting database tests in supabase/tests.
 * Usage: bun scripts/qa/journeys.ts
 */
import type { Page } from "playwright";

import { hasTotp, launch, newContext, reporter, BASE, type Role } from "./lib";

const rep = reporter();
const browser = await launch();

async function open(role: Role, path: string) {
  const ctx = await newContext(browser, { lang: "pt", role });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
}
const text = async (p: Page) => (await p.locator("body").innerText()).replace(/\s+/g, " ");

// ---- Tourist ----
{
  const { ctx, page, errors } = await open("tourist", "/dashboard");
  const t = await text(page);
  rep.line(
    /Olá/i.test(t) && /EKAYA Teste Turista/.test(t),
    "tourist: dashboard greets the account",
  );
  rep.line(
    !/Em desenvolvimento/.test(t),
    "tourist: dashboard modules without 'Em desenvolvimento'",
  );

  await page.goto(BASE + "/itineraries", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const province = await page.getByRole("combobox").first().innerText();
  rep.line(
    /Inhambane/.test(province),
    `tourist: itinerary filter prefilled from preferences (${province.trim()})`,
  );
  rep.line(
    (await page.getByRole("button", { name: "Repor as minhas preferências" }).count()) === 0,
    "tourist: no reset button while filters equal preferences",
  );

  await page.goto(BASE + "/experiences", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  rep.line(
    /A mostrar apenas experiências em Inhambane/.test(await text(page)),
    "tourist: experiences start on the saved province",
  );

  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const s = await text(page);
  const sections = [
    "Perfil",
    "Conta",
    "Preferências de viagem",
    "Aparência",
    "Notificações na app",
    "Privacidade",
    "Sobre",
  ];
  const missing = sections.filter((x) => !s.includes(x));
  rep.line(
    missing.length === 0,
    `tourist: settings sections (missing: ${missing.join(", ") || "none"})`,
  );
  try {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      page.getByRole("button", { name: "Exportar" }).click(),
    ]);
    const path = await download.path();
    const data = path ? JSON.parse(await Bun.file(path).text()) : null;
    const ok =
      !!data &&
      data.profile &&
      Array.isArray(data.bookings) &&
      Array.isArray(data.favorites) &&
      Array.isArray(data.points) &&
      Array.isArray(data.community_posts);
    rep.line(
      ok,
      `tourist: export my data → ${download.suggestedFilename()} (profile, bookings, favourites, points, posts)`,
    );
  } catch (e) {
    rep.line(false, `tourist: export my data — ${(e as Error).message.split("\n")[0]}`);
  }
  rep.line(errors.length === 0, `tourist: no page errors (${errors.length})`);
  await ctx.close();
}

// ---- Business ----
{
  const { ctx, page, errors } = await open("business", "/business-dashboard");
  rep.line(/EKAYA Teste/.test(await text(page)), "business: dashboard shows its business");
  rep.line(errors.length === 0, `business: no page errors (${errors.length})`);
  await ctx.close();
}

// ---- Admin ----
// The administration needs an aal2 session (SEG-2). Without TEST_ADMIN_TOTP_SECRET the account
// is password-only: /admin sends it to Settings → Security and the admin checks are skipped.
{
  const { ctx, page, errors } = await open("admin", "/admin");
  if (!hasTotp("admin")) {
    rep.line(new URL(page.url()).pathname === "/settings", "admin (aal1): /admin requires 2FA");
    rep.skip("admin: registered profiles (needs TEST_ADMIN_TOTP_SECRET for an aal2 session)");
  } else {
    await page
      .getByText(/Perfis registados \d+/)
      .waitFor({ timeout: 15000 })
      .catch(() => undefined);
    const t = await text(page);
    const m = t.match(/Perfis registados (\d+)/);
    rep.line(
      !!m && m[1] === "2",
      `admin: registered profiles leave internal accounts out (${m?.[1] ?? "?"}, expected 2)`,
    );
  }
  rep.line(errors.length === 0, `admin: no page errors (${errors.length})`);
  await ctx.close();
}

await browser.close();
rep.finish();
