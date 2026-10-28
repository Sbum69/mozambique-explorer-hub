/**
 * Language preference: the server renders in the visitor's language (ekaya.lang cookie), the
 * <html lang> follows it, older localStorage-only choices move to the cookie, and every page in EN
 * shows no Portuguese interface text.
 * Usage: bun scripts/qa/lang.ts [--pages=home,map]
 * PASS = server/hydrated language as expected; in EN no visible line with Portuguese accents
 * except names in the ALLOWED list (place names are not translated).
 */
import { launch, newContext, reporter, selectedPages, BASE } from "./lib";

// Proper names that keep their accents in English.
const ALLOWED = [
  /Zambézia|Ilha de Moçambique|Praça da Independência|Závora|São Sebastião|Núcleo de Arte/,
  /Lourenço Marques|José Craveirinha|Capitão Sálvio/,
  // Internal test business (to be deleted before launch).
  /EKAYA Teste|Negócio de teste interno/,
];

const h1Of = (html: string) =>
  (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();

const browser = await launch();
const out = reporter();

// Server render follows the cookie.
for (const [cookie, expected] of [
  ["ekaya.lang=en", "Activities"],
  ["ekaya.lang=pt", "Atividades"],
  ["", "Atividades"],
] as const) {
  const html = await (
    await fetch(BASE + "/experiences", { headers: cookie ? { cookie } : {} })
  ).text();
  out.line(
    h1Of(html).startsWith(expected),
    `server h1 with cookie "${cookie || "none"}" -> ${h1Of(html).slice(0, 30)}`,
  );
}

// Older choice only in localStorage: hydrated in EN and moved to the cookie.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem("qa")) {
      localStorage.setItem("ekaya.lang", "en");
      sessionStorage.setItem("qa", "1");
    }
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/experiences", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const h1 = (await page.locator("h1").first().innerText()).trim();
  const cookie = (await ctx.cookies()).find((c) => c.name === "ekaya.lang")?.value;
  const lang = await page.evaluate(() => document.documentElement.lang);
  out.line(
    h1.startsWith("Activities") && cookie === "en" && lang === "en",
    `localStorage-only en -> h1="${h1}" cookie=${cookie} html.lang=${lang}`,
  );
  await ctx.close();
}

// No Portuguese interface text on any page in EN.
for (const p of selectedPages()) {
  const ctx = await newContext(browser, { width: 1280, lang: "en", role: p.role });
  const page = await ctx.newPage();
  await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  const lines = [
    ...new Set(
      text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && /[ãõçáéíóúâêô]/i.test(l) && !ALLOWED.some((a) => a.test(l))),
    ),
  ];
  out.line(
    lines.length === 0,
    `EN ${p.name}${lines.length ? ` (${lines.length}): ${lines.slice(0, 6).join(" | ")}` : ""}`,
  );
  await ctx.close();
}
await browser.close();
out.finish();
