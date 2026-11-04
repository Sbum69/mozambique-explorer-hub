/**
 * Pre-launch gate: runs every check and prints one PASS/FAIL.
 *   1. tsc, lint (0 errors), Vitest, build (routeTree.gen.ts restored if the build changes it)
 *   2. database tests — they run through the Lovable connector, not from here: this reads the
 *      record qa-output/db-tests.json (written after each run) and fails if it is older than 24 h
 *      or not all PASS
 *   3. browser: hydration, widths, language, contrast, CSP, the 3 journeys (admin with TOTP), the
 *      new modules (content, commission, sponsored, for-business, assistant) and Lighthouse
 * Needs the production build served on QA_BASE (default http://127.0.0.1:4173).
 * Usage: bun scripts/qa/prelaunch.ts [--skip-build] [--skip-lighthouse]
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { REPO } from "./lib";

type Row = { step: string; status: "PASS" | "FAIL" | "SKIP"; note?: string };
const rows: Row[] = [];
const skip = (f: string) => process.argv.includes(f);

function run(
  step: string,
  cmd: string,
  args: string[],
  cwd = REPO,
  ok: (out: string) => boolean = () => true,
) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const pass = r.status === 0 && ok(out);
  rows.push({
    step,
    status: pass ? "PASS" : "FAIL",
    note: `${Math.round((Date.now() - t0) / 1000)} s`,
  });
  if (!pass) console.log(`--- ${step} ---\n${out.split("\n").slice(-25).join("\n")}`);
  console.log(`${pass ? "PASS" : "FAIL"} ${step}`);
  return pass;
}

// 1. code
run("tsc", "bunx", ["tsc", "--noEmit"]);
run("lint (0 errors)", "bun", ["run", "lint"]);
run("vitest", "bunx", ["vitest", "run"]);
if (!skip("--skip-build")) {
  const tree = join(REPO, "src/routeTree.gen.ts");
  const backup = join(REPO, "qa-output/routeTree.gen.ts.bak");
  copyFileSync(tree, backup);
  run("build", "bun", ["run", "build"]);
  if (readFileSync(tree, "utf8") !== readFileSync(backup, "utf8")) copyFileSync(backup, tree);
} else rows.push({ step: "build", status: "SKIP", note: "--skip-build" });

// 2. database tests record
const dbFile = join(REPO, "qa-output/db-tests.json");
if (!existsSync(dbFile))
  rows.push({ step: "database tests", status: "FAIL", note: "no qa-output/db-tests.json" });
else {
  const age = (Date.now() - statSync(dbFile).mtimeMs) / 3_600_000;
  const rec = JSON.parse(readFileSync(dbFile, "utf8")) as {
    tests: { file: string; pass: number; total: number }[];
  };
  const bad = rec.tests.filter((t) => t.pass !== t.total);
  rows.push({
    step: "database tests",
    status: age <= 24 && !bad.length ? "PASS" : "FAIL",
    note: `${rec.tests.length} files, ${age.toFixed(1)} h old${bad.length ? `, failing: ${bad.map((b) => b.file).join(", ")}` : ""}`,
  });
}

// 3. browser
const qa = join(REPO, "scripts/qa");
const allPass = (o: string) => /all PASS/.test(o) && !/^FAIL /m.test(o);
for (const s of [
  "hydration.ts",
  "widths.ts",
  "lang.ts",
  "contrast.ts",
  "csp.ts",
  "journeys.ts",
  "mfa.ts",
  "legal.ts",
  "content.ts",
  "commission.ts",
  "sponsored.ts",
  "for-business.ts",
  "assistant.ts",
])
  run(`browser: ${s}`, "bun", [s], qa, allPass);
if (!skip("--skip-lighthouse")) run("lighthouse", "bun", ["lighthouse.ts", "--runs=3"], qa);
else rows.push({ step: "lighthouse", status: "SKIP", note: "--skip-lighthouse" });

const failed = rows.filter((r) => r.status === "FAIL");
console.log("\n| step | result | note |\n| --- | --- | --- |");
for (const r of rows) console.log(`| ${r.step} | ${r.status} | ${r.note ?? ""} |`);
console.log(
  `\nPRELAUNCH: ${failed.length ? "FAIL" : "PASS"} (${rows.length - failed.length}/${rows.length})`,
);
process.exit(failed.length ? 1 : 0);
