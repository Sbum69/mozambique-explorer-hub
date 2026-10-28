import { describe, expect, it } from "vitest";

import { langFromCookieHeader, parseLang } from "./lang-pref";

describe("lang-pref", () => {
  it("accepts only pt and en", () => {
    expect(parseLang("pt")).toBe("pt");
    expect(parseLang("en")).toBe("en");
    expect(parseLang("fr")).toBeNull();
    expect(parseLang(undefined)).toBeNull();
  });

  it("reads ekaya.lang from a cookie header", () => {
    expect(langFromCookieHeader("ekaya.lang=en")).toBe("en");
    expect(langFromCookieHeader("a=1; ekaya.lang=pt; b=2")).toBe("pt");
    expect(langFromCookieHeader("xekaya.lang=en")).toBeNull();
    expect(langFromCookieHeader("ekaya.lang=de")).toBeNull();
    expect(langFromCookieHeader("")).toBeNull();
  });
});
