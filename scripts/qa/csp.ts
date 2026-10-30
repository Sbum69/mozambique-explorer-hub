/**
 * SEG-2 — enforced Content-Security-Policy: every QA page (guest and signed-in) must load with no
 * CSP violation in the console and no request blocked by the policy.
 * Usage: bun scripts/qa/csp.ts [--pages=home,map]
 */
import { launch, newContext, reporter, selectedPages, BASE } from "./lib";

const rep = reporter();
const browser = await launch();
for (const p of selectedPages()) {
  const ctx = await newContext(browser, { width: 1280, role: p.role });
  const page = await ctx.newPage();
  const violations: string[] = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to (load|connect|execute|apply|frame)/i.test(t))
      violations.push(t.slice(0, 200));
  });
  const res = await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(3500);
  // Scroll once so lazy images and map tiles below the fold load too.
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(1500);
  const header = res?.headers()["content-security-policy"] ?? "";
  rep.line(
    header.includes("default-src 'self'") && violations.length === 0,
    `${p.name}: CSP enforced, ${violations.length} violations${violations.length ? " — " + violations[0] : ""}`,
  );
  await ctx.close();
}
await browser.close();
rep.finish();
