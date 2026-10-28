/**
 * Things that only appear after a tap open, fit the screen and close (read-only: opens and closes,
 * never submits; the confirmation dialog is always cancelled).
 * Usage: bun scripts/qa/interactions.ts
 * PASS = the panel/dialog opens with content, stays inside the screen at 320/390/1280 px and closes.
 */
import type { Page } from "playwright";

import { launch, newContext, reporter, BASE, type Role } from "./lib";

type Case = { name: string; path: string; role?: Role; open: (p: Page) => Promise<unknown> };
const cases: Case[] = [
  {
    name: "menu",
    path: "/experiences",
    open: (p) => p.getByRole("button", { name: "Menu" }).click(),
  },
  {
    name: "notifications",
    path: "/experiences",
    open: (p) => p.getByRole("button", { name: "Notificações" }).click(),
  },
  {
    name: "theme menu",
    path: "/experiences",
    open: (p) => p.getByRole("button", { name: /^Tema/ }).click(),
  },
  {
    name: "home destination select",
    path: "/home",
    open: (p) => p.getByRole("combobox").first().click(),
  },
  {
    name: "community-experience dialog",
    path: "/community-experiences",
    open: (p) => p.locator("main button.text-left").first().click(),
  },
  {
    name: "community editor",
    path: "/community",
    role: "tourist",
    open: (p) => p.getByRole("button", { name: /Nova publicação/ }).click(),
  },
  {
    name: "new-post sign-in gate",
    path: "/community",
    open: (p) => p.getByRole("button", { name: /Nova publicação/ }).click(),
  },
  {
    name: "delete confirmation (cancelled)",
    path: "/community",
    role: "admin",
    open: (p) =>
      p
        .getByRole("button", { name: /Eliminar/ })
        .first()
        .click(),
  },
];

const browser = await launch();
const out = reporter();
for (const width of [320, 390, 1280]) {
  for (const c of cases) {
    const ctx = await newContext(browser, { width, lang: "pt", role: c.role });
    const page = await ctx.newPage();
    await page.goto(BASE + c.path, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(1500);
    let problem = "";
    try {
      await c.open(page);
      // Radix panels have a role; the community editor is a fixed overlay with a form.
      const panel = page
        .locator(
          '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], .fixed.inset-0:has(form, textarea) > div',
        )
        .last();
      await panel.waitFor({ state: "visible", timeout: 8000 });
      await page.waitForTimeout(900); // let the slide/zoom-in animation finish before measuring
      problem = await panel.evaluate((el) => {
        const vw = document.documentElement.clientWidth;
        const r = el.getBoundingClientRect();
        if (r.left < -1 || r.right > vw + 1)
          return `outside the screen (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`;
        if (!(el.textContent ?? "").trim()) return "opened empty";
        return "";
      });
      // Confirmation and the community editor close with their Cancel button (the editor does not
      // handle Escape yet); Radix panels close with Escape.
      const cancel = page
        .locator('[role="alertdialog"], .fixed.inset-0:has(form, textarea)')
        .getByRole("button", { name: /^(Cancelar|Cancel)$/ });
      if (await cancel.count()) await cancel.click();
      else await page.keyboard.press("Escape");
      await panel.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {
        problem ||= "did not close";
      });
    } catch (e) {
      problem = "did not open: " + (e as Error).message.split("\n")[0].slice(0, 80);
    }
    out.line(!problem, `@${width} ${c.name}${problem ? " — " + problem : ""}`);
    await ctx.close();
  }
}
await browser.close();
out.finish();
