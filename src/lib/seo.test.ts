import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { homeHead } from "./home-head";

import {
  PRIVATE_PATH_PREFIXES,
  PUBLIC_SITEMAP_PATHS,
  canonicalUrl,
  robotsTxt,
  sitemapXml,
} from "./seo";

describe("SEO: sitemap and robots", () => {
  it("lists absolute URLs on the canonical domain, whatever host serves it", () => {
    const xml = sitemapXml();
    expect(xml).toContain("<loc>https://exploreekaya.com/</loc>");
    expect(xml).toContain("<loc>https://exploreekaya.com/para-negocios</loc>");
    expect(xml).not.toContain("/home<");
    expect(xml).not.toContain("lovable.app");
    expect(xml.match(/<url>/g)).toHaveLength(PUBLIC_SITEMAP_PATHS.length);
  });

  it("keeps private pages out of the sitemap and disallows them", () => {
    for (const p of PUBLIC_SITEMAP_PATHS)
      expect(PRIVATE_PATH_PREFIXES.some((x) => p.startsWith(x))).toBe(false);
    const txt = robotsTxt();
    expect(txt).toContain("Allow: /\n");
    expect(txt).not.toContain("Disallow: /\n");
    expect(txt).toContain("Disallow: /admin");
    expect(txt).toContain("Sitemap: https://exploreekaya.com/sitemap.xml");
  });

  it("serves the same robots.txt on every host (static file in public/)", () => {
    const file = readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");
    expect(file).toBe(robotsTxt());
  });

  it("gives canonical URLs to public pages only", () => {
    expect(canonicalUrl("/")).toBe("https://exploreekaya.com/");
    expect(canonicalUrl("/home")).toBe("https://exploreekaya.com/");
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
    for (const p of PUBLIC_SITEMAP_PATHS) expect(files).toContain(p === "/" ? "index" : p.slice(1));
  });
});

describe("SEO: lastmod, detail pages and structured data", () => {
  it("adds lastmod to static pages and lists public detail pages", () => {
    const xml = sitemapXml([{ path: "/itinerary/abc", lastmod: "2026-11-10T12:00:00Z" }]);
    expect(xml).toContain("<loc>https://exploreekaya.com/</loc><lastmod>2026-11-12</lastmod>");
    expect(xml).toContain(
      "<loc>https://exploreekaya.com/itinerary/abc</loc><lastmod>2026-11-10</lastmod>",
    );
  });

  it("home carries Organization and WebSite JSON-LD with the EKAYA name", () => {
    const ld = JSON.parse(homeHead().scripts[1].children) as {
      "@type": string;
      name: string;
      alternateName: string[];
    }[];
    expect(ld.map((x) => x["@type"])).toEqual(["Organization", "WebSite"]);
    expect(ld.every((x) => x.name === "EKAYA")).toBe(true);
    expect(ld[1].alternateName).toEqual(
      expect.arrayContaining(["exploreekaya", "Explore Ekaya", "Ekaya Moçambique"]),
    );
  });
});
