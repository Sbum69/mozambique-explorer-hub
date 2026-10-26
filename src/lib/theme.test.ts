import { describe, expect, it } from "vitest";

import { THEME_INIT_SCRIPT, parseThemePreference, resolveTheme } from "./theme";

/** Runs the <head> script against a fake document, storage and media query. */
function runInitScript(stored: string | null, systemDark: boolean, storageThrows = false) {
  const classes = new Set<string>();
  const root = {
    classList: {
      add: (c: string) => void classes.add(c),
      remove: (c: string) => void classes.delete(c),
    },
    style: { colorScheme: "" },
  };
  const localStorage = {
    getItem: () => {
      if (storageThrows) throw new Error("blocked");
      return stored;
    },
  };
  const window = { matchMedia: () => ({ matches: systemDark }) };
  new Function("localStorage", "window", "document", THEME_INIT_SCRIPT)(localStorage, window, {
    documentElement: root,
  });
  return { dark: classes.has("dark"), scheme: root.style.colorScheme };
}

describe("ADM-2B theme preference", () => {
  it("only light and dark are stored choices; anything else means follow the system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("blue")).toBe("system");
  });

  it("resolves the system choice from the operating system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("the <head> script applies the same rule before the first paint", () => {
    expect(runInitScript(null, true)).toEqual({ dark: true, scheme: "dark" });
    expect(runInitScript(null, false)).toEqual({ dark: false, scheme: "light" });
    expect(runInitScript("light", true)).toEqual({ dark: false, scheme: "light" });
    expect(runInitScript("dark", false)).toEqual({ dark: true, scheme: "dark" });
    expect(runInitScript("garbage", true)).toEqual({ dark: true, scheme: "dark" });
  });

  it("the <head> script never throws when storage is blocked", () => {
    expect(() => runInitScript(null, true, true)).not.toThrow();
  });
});
