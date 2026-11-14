/**
 * End-to-end: Home "Explorar a app" → /login?redirect=/dashboard → sign in (→ 2FA) → the panel of
 * the account's role. Also: a visitor who already has a session.
 * Usage: QA_BASE=https://exploreekaya.com bun scripts/qa/login-redirect.ts [--roles=tourist,admin]
 * Uses only the test accounts of .env.test.local (credentials are never printed). Signs in through
 * the app's login form, which only creates a session: nothing else is submitted.
 */
import { BASE, credentialsFor, launch, newContext, totp, type Role } from "./lib";

const EXPECTED: Record<Role, string> = {
  tourist: "/dashboard",
  business: "/business-dashboard",
  admin: "/admin",
};
const rolesArg = process.argv.find((a) => a.startsWith("--roles="));
const roles = (
  rolesArg ? rolesArg.slice(8).split(",") : ["tourist", "business", "admin"]
) as Role[];

const browser = await launch();
let failures = 0;
// A TOTP code is accepted once: wait for the next 30 s window before reusing the same account.
let lastCode = "";

async function run(role: Role, width: number, withSession: boolean) {
  const creds = credentialsFor(role);
  if (!creds) {
    console.log(`BLOCKED ${role}: no test account in .env.test.local`);
    return;
  }
  const ctx = await newContext(browser, { width, role: withSession ? role : undefined });
  const page = await ctx.newPage();
  const trail: string[] = [];
  let mfaAsked = false;
  page.on("framenavigated", (f) => {
    if (f !== page.mainFrame()) return;
    const u = new URL(f.url());
    const step = u.pathname + u.search;
    if (trail[trail.length - 1] !== step) trail.push(step);
  });
  try {
    await page.goto(BASE + "/home", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page
      .getByRole("navigation", { name: "Ações principais" })
      .getByRole("link", { name: "Explorar a app" })
      .click();
    if (!withSession) {
      await page.waitForURL(/\/login/, { timeout: 15000 });
      // Supabase Auth rate-limits password sign-ins: space them out.
      await page.waitForTimeout(15000);
      await page.locator("#email").fill(creds.email);
      await page.locator("#password").fill(creds.password);
      await page.locator("form button[type=submit]").first().click();
    }
    // Two-step verification (admin): the code prompt appears over the page.
    const code = page.locator("#mfa-code");
    if (
      creds.totpSecret &&
      (await code.waitFor({ timeout: 10000 }).then(
        () => true,
        () => false,
      ))
    ) {
      mfaAsked = true;
      trail.push("[código 2FA]");
      while (totp(creds.totpSecret) === lastCode) await page.waitForTimeout(1000);
      lastCode = totp(creds.totpSecret);
      await code.fill(lastCode);
      await page.locator("#mfa-code").press("Enter");
    }
    await page.waitForTimeout(8000);
  } catch (e) {
    trail.push(`ERROR ${(e as Error).message.split("\n")[0]}`);
  }
  const final = new URL(page.url()).pathname;
  // A password sign-in of an account with 2FA must go through the code prompt.
  const mfaOk = withSession || !creds.totpSecret || mfaAsked;
  const ok = final === EXPECTED[role] && mfaOk;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${role} ${width}px ${withSession ? "com sessão" : "login"}: ${trail.join(" → ")} (esperado ${EXPECTED[role]})`,
  );
  await ctx.close();
}

for (const role of roles)
  for (const width of [390, 1280]) {
    await run(role, width, false);
    await run(role, width, true);
  }
await browser.close();
process.exit(failures ? 1 : 0);
