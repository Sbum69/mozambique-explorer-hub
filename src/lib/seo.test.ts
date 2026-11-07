import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  PRIVATE_PATH_PREFIXES,
  PUBLIC_SITEMAP_PATHS,
  canonicalUrl,
  isCanonicalOrigin,
  robotsTxt,
  sitemapXml,
} from "./seo";

describe("SEO: sitemap and robots", () => {
  it("lists absolute URLs on the canonical domain, whatever host serves it", () => {
    const xml = sitemapXml();
    expect(xml).toContain("<loc>https://exploreekaya.com/para-negocios</loc>");
    expect(xml).not.toContain("lovable.app");
    expect(xml.match(/<url>/g)).toHaveLength(PUBLIC_SITEMAP_PATHS.length);
  });

  it("keeps private pages out of the sitemap and disallows them on the canonical domain", () => {
    for (const p of PUBLIC_SITEMAP_PATHS)
      expect(PRIVATE_PATH_PREFIXES.some((x) => p.startsWith(x))).toBe(false);
    const txt = robotsTxt("https://exploreekaya.com");
    expect(txt).toContain("Allow: /");
    expect(txt).toContain("Disallow: /admin");
    expect(txt).toContain("Sitemap: https://exploreekaya.com/sitemap.xml");
  });

  it("blocks every crawler on other hosts (preview copies on *.lovable.app)", () => {
    for (const origin of [
      "https://ekaya.lovable.app",
      "https://www.exploreekaya.com",
      "http://localhost:4173",
    ]) {
      expect(isCanonicalOrigin(origin)).toBe(false);
      const txt = robotsTxt(origin);
      expect(txt).toContain("Disallow: /\n");
      expect(txt).not.toContain("Sitemap:");
    }
    expect(isCanonicalOrigin("https://exploreekaya.com")).toBe(true);
  });

  it("gives canonical URLs to public pages only", () => {
    expect(canonicalUrl("/home")).toBe("https://exploreekaya.com/home");
    expect(canonicalUrl("/experience/abc?x=1#top")).toBe("https://exploreekaya.com/experience/abc");
    expect(canonicalUrl("/itineraries/")).toBe("https://exploreekaya.com/itineraries");
    expect(canonicalUrl("/admin")).toBeNull();
    expect(canonicalUrl("/settings")).toBeNull();
    expect(canonicalUrl("/recibo/123")).toBeNull();
    expect(canonicalUrl("/auth/callback")).toBeNull();
  });

  it("every sitemap page exists as a route", () => {
    const files = readdirSync(new URL("../routes", import.meta.url)).map((f) =>
      f.replace(/\.tsx?$/, ""),
    );
    for (const p of PUBLIC_SITEMAP_PATHS) expect(files).toContain(p.slice(1));
  });
});
