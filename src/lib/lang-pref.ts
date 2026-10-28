import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import type { Lang } from "@/contexts/LanguageContext";

/**
 * UI language preference (not business data). Kept in a cookie so the server renders the page in
 * the visitor's language, and in localStorage as before.
 */
export const LANG_KEY = "ekaya.lang";
export const DEFAULT_LANG: Lang = "pt";

export function parseLang(value: string | null | undefined): Lang | null {
  return value === "pt" || value === "en" ? value : null;
}

export function langFromCookieHeader(header: string): Lang | null {
  const match = header.match(/(?:^|;\s*)ekaya\.lang=([^;]*)/);
  return parseLang(match?.[1]);
}

/** The language the server rendered with: the cookie, on both sides, so hydration matches. */
export const readLangCookie = createIsomorphicFn()
  .server((): Lang | null => parseLang(getCookie(LANG_KEY)))
  .client((): Lang | null => langFromCookieHeader(document.cookie));

/** Older visits only saved localStorage; used once to carry that choice over to the cookie. */
export function readStoredLang(): Lang | null {
  try {
    return parseLang(localStorage.getItem(LANG_KEY));
  } catch {
    return null;
  }
}

export function writeLangPref(lang: Lang) {
  document.cookie = `${LANG_KEY}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage blocked: the cookie still carries the choice.
  }
}
