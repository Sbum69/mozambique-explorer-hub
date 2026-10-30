/**
 * Shared helpers for the browser QA scripts (read-only: they navigate and read, never submit forms).
 * Credentials come only from .env.test.local and are never printed or written to disk.
 */
import { chromium, type Browser, type BrowserContext } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const REPO = resolve(import.meta.dir, "../..");
export const BASE = (process.env.QA_BASE ?? "http://127.0.0.1:4173").replace(/\/$/, "");
export const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export type Role = "tourist" | "business" | "admin";
export type Lang = "pt" | "en";
export type Theme = "light" | "dark";

/** Pages checked by the scripts. role = page needs that account's session. */
export interface QaPage {
  name: string;
  path: string;
  role?: Role;
}

export const PAGES: QaPage[] = [
  { name: "home", path: "/home" },
  { name: "map", path: "/map" },
  { name: "experiences", path: "/experiences" },
  { name: "community", path: "/community" },
  { name: "community-experiences", path: "/community-experiences" },
  { name: "businesses", path: "/businesses" },
  { name: "itineraries", path: "/itineraries" },
  { name: "itinerary", path: "/itinerary/11111111-1111-4111-8111-111111111111" },
  { name: "culture-history", path: "/culture-history" },
  { name: "useful-info", path: "/useful-info" },
  { name: "impact", path: "/impact" },
  { name: "news-alerts", path: "/news-alerts" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "business-register", path: "/business-register" },
  { name: "t-home", path: "/home", role: "tourist" },
  { name: "t-dashboard", path: "/dashboard", role: "tourist" },
  { name: "t-bookings", path: "/bookings", role: "tourist" },
  { name: "t-favorites", path: "/favorites", role: "tourist" },
  { name: "t-gamification", path: "/gamification", role: "tourist" },
  { name: "t-games", path: "/games", role: "tourist" },
  { name: "t-preferences", path: "/preferences", role: "tourist" },
  { name: "t-settings", path: "/settings", role: "tourist" },
  { name: "terms", path: "/terms" },
  { name: "b-dashboard", path: "/business-dashboard", role: "business" },
  { name: "a-admin", path: "/admin", role: "admin" },
];

/** --pages=home,map keeps only those page names. */
export function selectedPages(all: QaPage[] = PAGES): QaPage[] {
  const arg = process.argv.find((a) => a.startsWith("--pages="));
  if (!arg) return all;
  const names = arg.slice("--pages=".length).split(",");
  return all.filter((p) => names.includes(p.name));
}

export function readEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
}

const app = readEnv(join(REPO, ".env"));
const test = readEnv(join(REPO, ".env.test.local"));
const SUPA_URL = app.VITE_SUPABASE_URL;
const SUPA_KEY = app.VITE_SUPABASE_PUBLISHABLE_KEY;
export const AUTH_STORAGE_KEY = `sb-${new URL(SUPA_URL).hostname.split(".")[0]}-auth-token`;

const sessions = new Map<Role, string | null>();
/** Session JSON from the auth API (no app form is submitted); null if the account is not set up. */
export async function sessionFor(role: Role): Promise<string | null> {
  if (sessions.has(role)) return sessions.get(role)!;
  const email = test[`TEST_${role.toUpperCase()}_EMAIL`];
  const password = test[`TEST_${role.toUpperCase()}_PASSWORD`];
  let value: string | null = null;
  if (email && password) {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) value = JSON.stringify(await res.json());
  }
  sessions.set(role, value);
  return value;
}

export async function launch(): Promise<Browser> {
  return chromium.launch({ channel: "msedge" });
}

export interface ContextOptions {
  width?: number;
  height?: number;
  /** Phone emulation (touch, mobile viewport, 3x pixels) for widths below 768. */
  mobile?: boolean;
  lang?: Lang;
  theme?: Theme;
  role?: Role;
}

/** Browser context with language cookie, theme and (optionally) a test account session. */
export async function newContext(
  browser: Browser,
  o: ContextOptions = {},
): Promise<BrowserContext> {
  const width = o.width ?? 1280;
  const mobile = o.mobile ?? width < 768;
  const ctx = await browser.newContext({
    viewport: { width, height: o.height ?? (mobile ? 800 : 900) },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 3 : 1,
    colorScheme: o.theme ?? "light",
  });
  if (o.lang) {
    await ctx.addCookies([{ name: "ekaya.lang", value: o.lang, url: BASE }]);
    await ctx.addInitScript((l) => localStorage.setItem("ekaya.lang", l), o.lang);
  }
  if (o.theme) await ctx.addInitScript((t) => localStorage.setItem("ekaya.theme", t), o.theme);
  if (o.role) {
    const s = await sessionFor(o.role);
    if (!s) throw new Error(`no ${o.role} test account in .env.test.local`);
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [AUTH_STORAGE_KEY, s] as const);
  }
  return ctx;
}

/** qa-output/<name>/ (ignored by Git). */
export function outDir(name: string): string {
  const dir = join(REPO, "qa-output", name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** PASS/FAIL line printer that also tracks the exit code. */
export function reporter() {
  let failed = 0;
  return {
    line(ok: boolean, text: string) {
      if (!ok) failed++;
      console.log(`${ok ? "PASS" : "FAIL"} ${text}`);
    },
    finish() {
      console.log(failed ? `\n${failed} FAIL` : "\nall PASS");
      process.exit(failed ? 1 : 0);
    },
  };
}
