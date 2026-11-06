/**
 * Writes public/licenses.json: name, version and licence of every production dependency
 * (the "dependencies" of package.json, read from node_modules). /creditos fetches it only when the
 * licence list is opened, so nothing is computed in the browser and nothing enters the first load.
 *
 *   bun scripts/licenses.ts          (also runs before `bun run build`, as "prebuild")
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Pkg {
  name?: string;
  version?: string;
  license?: string | { type?: string };
  licenses?: { type?: string }[];
  homepage?: string;
  repository?: string | { url?: string };
  dependencies?: Record<string, string>;
}

export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string | null;
}

const root = process.cwd();
const read = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Pkg;

function licenseOf(p: Pkg): string {
  if (typeof p.license === "string") return p.license;
  if (p.license?.type) return p.license.type;
  const list = (p.licenses ?? []).map((l) => l.type).filter(Boolean);
  return list.length ? list.join(" OR ") : "UNKNOWN";
}

function urlOf(p: Pkg): string | null {
  const repo = typeof p.repository === "string" ? p.repository : p.repository?.url;
  const raw = p.homepage ?? repo ?? null;
  if (!raw) return null;
  const url = raw
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^github:/, "https://github.com/")
    .replace(/\.git(#.*)?$/, "");
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) return `https://github.com/${url}`;
  return url.startsWith("https://") ? url : null;
}

const deps = Object.keys(read(join(root, "package.json")).dependencies ?? {}).sort();
const entries: LicenseEntry[] = deps.map((name) => {
  const p = read(join(root, "node_modules", name, "package.json"));
  return { name, version: p.version ?? "", license: licenseOf(p), url: urlOf(p) };
});

const unknown = entries.filter((e) => e.license === "UNKNOWN").map((e) => e.name);
if (unknown.length) console.warn(`licenses: no licence field in ${unknown.join(", ")}`);

writeFileSync(join(root, "public", "licenses.json"), JSON.stringify(entries) + "\n");
console.log(`licenses: ${entries.length} production dependencies → public/licenses.json`);
