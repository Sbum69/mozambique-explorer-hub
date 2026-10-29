/**
 * UX-1 — what a visitor (no session) can and cannot do. Read-only: opens pages, the side menu and
 * the "account needed" dialog, and closes them; never submits.
 * Usage: bun scripts/qa/guest.ts
 * PASS = private pages send the visitor to /login?redirect=<page>; the side menu only lists reading
 * pages plus "Entrar"/"Criar conta"; no notification bell; blocked actions open one dialog that
 * links back to the page.
 */
import { launch, newContext, reporter, BASE } from "./lib";

const rep = reporter();
const browser = await launch();
const ctx = await newContext(browser, { lang: "pt" });
const page = await ctx.newPage();

// Private pages → login with the way back (allow-listed pages keep ?redirect=).
const PRIVATE: [string, string | null][] = [
  ["/dashboard", "/dashboard"],
  ["/games", "/games"],
  ["/gamification", "/gamification"],
  ["/favorites", "/favorites"],
  ["/bookings", "/bookings"],
  ["/settings", "/settings"],
  ["/preferences", null],
];
for (const [path, back] of PRIVATE) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => undefined);
  const url = new URL(page.url());
  const ok = url.pathname === "/login" && (url.searchParams.get("redirect") ?? null) === back;
  rep.line(ok, `private ${path} → ${url.pathname}${url.search}`);
}

// Side menu: reading pages only, sign in / sign up at the top.
await page.goto(BASE + "/experiences", { waitUntil: "networkidle" });
rep.line(
  (await page.getByRole("button", { name: "Notificações" }).count()) === 0,
  "no notification bell for visitors",
);
await page.getByRole("button", { name: "Menu" }).click();
const panel = page.getByRole("dialog");
await panel.getByRole("link").first().waitFor();
const hrefs = await panel
  .getByRole("link")
  .evaluateAll((els) => els.map((e) => new URL((e as HTMLAnchorElement).href).pathname));
const forbidden = [
  "/dashboard",
  "/bookings",
  "/favorites",
  "/preferences",
  "/settings",
  "/gamification",
  "/games",
];
const leaked = hrefs.filter((h) => forbidden.includes(h));
rep.line(leaked.length === 0, `menu has no private pages (${leaked.join(", ") || "none"})`);
const reading = [
  "/home",
  "/map",
  "/experiences",
  "/itineraries",
  "/culture-history",
  "/news-alerts",
];
const missing = reading.filter((h) => !hrefs.includes(h));
rep.line(
  missing.length === 0,
  `menu lists reading pages (missing: ${missing.join(", ") || "none"})`,
);
const texts = (await panel.innerText()).replace(/\s+/g, " ");
rep.line(/Entrar/.test(texts) && /Criar conta/.test(texts), "menu offers Entrar and Criar conta");
rep.line(
  !/NOVO|Ver Planos|Plano Básico|🎮/.test(texts),
  "no NOVO badges, plans card or joystick emoji",
);
await page.keyboard.press("Escape");

// Blocked actions: one dialog, "Cria conta ou entra para …", sign-in link back to the page.
const ACTIONS: { path: string; label: string; trigger: () => Promise<void> }[] = [
  {
    // Bookings use the same gate; /experiences has no active activity to book right now.
    path: "/itineraries",
    label: "importar roteiros",
    trigger: () =>
      page
        .getByRole("button", { name: /Importar Roteiro/ })
        .first()
        .click(),
  },
  {
    path: "/community",
    label: "publicar na comunidade",
    trigger: () =>
      page
        .getByRole("button", { name: /Publicar|Nova publicação|Partilhar/ })
        .first()
        .click(),
  },
];
for (const a of ACTIONS) {
  await page.goto(BASE + a.path, { waitUntil: "networkidle" });
  try {
    await a.trigger();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 5_000 });
    const title = await dialog.getByRole("heading").first().innerText();
    const href = await dialog.getByRole("link", { name: "Entrar" }).getAttribute("href");
    rep.line(
      title.includes(`Cria conta ou entra para ${a.label}`) &&
        !!href?.includes(`redirect=${encodeURIComponent(a.path)}`),
      `${a.path}: "${title}" → ${href}`,
    );
    await page.keyboard.press("Escape");
  } catch (e) {
    rep.line(false, `${a.path}: ${(e as Error).message.split("\n")[0]}`);
  }
}

await browser.close();
rep.finish();
