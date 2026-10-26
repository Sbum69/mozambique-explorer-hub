/**
 * Light / dark theme. The choice is a UI preference kept in localStorage ("ekaya.theme"); with no choice
 * (first visit) the operating-system theme is followed.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ekaya.theme";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Runs in <head> before the page paints, so a dark choice never flashes white. Kept as plain ES5 and
 * self-contained; it must stay in step with resolveTheme().
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;if(d){e.classList.add("dark")}else{e.classList.remove("dark")}e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;
