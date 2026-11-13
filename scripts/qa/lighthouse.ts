/**
 * Lighthouse mobile performance, median of N runs per page, on the production build.
 * Usage: bun scripts/qa/lighthouse.ts [--pages=home,map] [--runs=3] [--devtools]
 *   --devtools uses real (DevTools) throttling instead of the simulated default.
 * Sessions: pages with a role get a fresh Edge profile holding that account's session and Lighthouse
 * attaches to it (--disable-storage-reset), so nothing is cached between runs.
 * Output: qa-output/lighthouse/summary.json (+ one JSON per run). Close other dev servers first:
 * they compete for CPU and inflate Total Blocking Time.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

import {
  selectedPages,
  sessionFor,
  outDir,
  AUTH_STORAGE_KEY,
  BASE,
  EDGE,
  BROWSER,
  type QaPage,
} from "./lib";

const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.slice(7) ?? 3);
const devtools = process.argv.includes("--devtools");
const LH = join(import.meta.dir, "node_modules/lighthouse/cli/index.js");
const dir = outDir(devtools ? "lighthouse-devtools" : "lighthouse");

const DEFAULT_PAGES: QaPage[] = [
  { name: "home", path: "/home" },
  { name: "map", path: "/map" },
  { name: "itineraries", path: "/itineraries" },
  { name: "itinerary", path: "/itinerary/11111111-1111-4111-8111-111111111111" },
  { name: "experiences", path: "/experiences" },
  { name: "community", path: "/community" },
  { name: "games", path: "/games", role: "tourist" },
  { name: "dashboard", path: "/dashboard", role: "tourist" },
  { name: "useful-info", path: "/useful-info" },
  { name: "login", path: "/login" },
];

let profileN = 0;
async function profileWithSession(p: QaPage): Promise<string> {
  const profile = join(dir, `edge-profile-${Date.now()}-${profileN++}`);
  const session = await sessionFor(p.role!);
  if (!session) throw new Error(`no ${p.role} test account`);
  // Set the session on a static asset of the same origin: no app JavaScript gets cached.
  const html = await (await fetch(BASE + "/login")).text();
  const css = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1] ?? "/";
  const ctx = await chromium.launchPersistentContext(profile, {
    ...BROWSER,
    headless: true,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + css);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [AUTH_STORAGE_KEY, session]);
  await ctx.close();
  return profile;
}

type Row = Record<string, number | string>;
const summary: Row[] = [];
for (const p of selectedPages(DEFAULT_PAGES)) {
  const samples: Row[] = [];
  for (let r = 0; r < runs; r++) {
    const file = join(dir, `${p.name}-${r}.json`);
    const args = [
      LH,
      BASE + p.path,
      "--quiet",
      "--only-categories=performance",
      "--output=json",
      `--output-path=${file}`,
      "--chrome-flags=--headless=new --no-first-run",
      "--max-wait-for-load=60000",
      ...(devtools ? ["--throttling-method=devtools"] : []),
    ];
    let edge: ReturnType<typeof Bun.spawn> | null = null;
    let profile: string | null = null;
    if (p.role) {
      profile = await profileWithSession(p);
      edge = Bun.spawn([
        EDGE,
        "--headless=new",
        "--no-first-run",
        "--remote-debugging-port=9333",
        `--user-data-dir=${profile}`,
        "about:blank",
      ]);
      await Bun.sleep(4000);
      args.push("--port=9333", "--disable-storage-reset");
    }
    spawnSync("node", args, {
      encoding: "utf8",
      timeout: 240000,
      env: { ...process.env, CHROME_PATH: EDGE },
    });
    if (edge) {
      edge.kill();
      await Bun.sleep(1500);
    }
    // Temporary Edge profiles are large: remove each one after its run.
    if (profile) rmSync(profile, { recursive: true, force: true });
    if (!existsSync(file)) {
      samples.push({ error: "no report" });
      continue;
    }
    const lhr = JSON.parse(readFileSync(file, "utf8"));
    const a = lhr.audits;
    samples.push({
      score: Math.round((lhr.categories.performance.score ?? 0) * 100),
      fcp: +(a["first-contentful-paint"].numericValue / 1000).toFixed(2),
      lcp: +(a["largest-contentful-paint"].numericValue / 1000).toFixed(2),
      tbt: Math.round(a["total-blocking-time"].numericValue),
      cls: +a["cumulative-layout-shift"].numericValue.toFixed(3),
      kb: Math.round(a["total-byte-weight"].numericValue / 1024),
      final: new URL(lhr.finalDisplayedUrl).pathname,
    });
  }
  const ok = samples
    .filter((s) => !("error" in s))
    .sort((x, y) => (x.score as number) - (y.score as number));
  const median = ok[Math.floor(ok.length / 2)] ?? samples[0];
  summary.push({ page: p.name, runs: ok.length, ...median });
  console.log(JSON.stringify({ page: p.name, ...median }));
}
writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 2));
