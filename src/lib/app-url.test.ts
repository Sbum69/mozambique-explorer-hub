import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppBaseUrl, getAuthCallbackUrl, isPrivateHost } from "./app-url";
import { noindexHost } from "./robots-middleware";

const at = (origin: string) => vi.stubGlobal("window", { location: { origin } });

describe("auth email links follow the domain the person used", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exploreekaya.com and www both send links to the root domain", () => {
    at("https://exploreekaya.com");
    expect(getAuthCallbackUrl()).toBe("https://exploreekaya.com/auth/callback");
    at("https://www.exploreekaya.com");
    expect(getAppBaseUrl()).toBe("https://exploreekaya.com");
  });

  it("the published *.lovable.app address keeps working until the domain is live", () => {
    at("https://ekaya-explore.lovable.app");
    expect(getAuthCallbackUrl()).toBe("https://ekaya-explore.lovable.app/auth/callback");
  });

  it("private preview hosts and plain http are never used in emails", () => {
    for (const o of [
      "https://id-preview--abc.lovable.app",
      "http://exploreekaya.com",
      "http://localhost:4173",
    ]) {
      at(o);
      expect(getAuthCallbackUrl()).toBeUndefined();
    }
    expect(isPrivateHost("preview--x.lovable.app")).toBe(true);
  });
});

describe("noindex outside exploreekaya.com", () => {
  it("only the canonical host is indexable", () => {
    expect(noindexHost("exploreekaya.com")).toBe(false);
    expect(noindexHost("EXPLOREEKAYA.COM")).toBe(false);
    expect(noindexHost("www.exploreekaya.com")).toBe(true);
    expect(noindexHost("ekaya-explore.lovable.app")).toBe(true);
    expect(noindexHost("localhost")).toBe(true);
  });
});
