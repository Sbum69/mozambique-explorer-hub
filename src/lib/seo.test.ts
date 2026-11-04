import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PRIVATE_PATH_PREFIXES, PUBLIC_SITEMAP_PATHS, robotsTxt, sitemapXml } from "./seo";

describe("SEO: sitemap and robots", () => {
  it("lists absolute URLs on the request origin", () => {
    const xml = sitemapXml("https://ekaya.example/");
    expect(xml).toContain("<loc>https://ekaya.example/para-negocios</loc>");
    expect(xml.match(/<url>/g)).toHaveLength(PUBLIC_SITEMAP_PATHS.length);
  });

  it("keeps private pages out of the sitemap and disallows them", () => {
    for (const p of PUBLIC_SITEMAP_PATHS)
      expect(PRIVATE_PATH_PREFIXES.some((x) => p.startsWith(x))).toBe(false);
    const txt = robotsTxt("https://ekaya.example");
    expect(txt).toContain("Disallow: /admin");
    expect(txt).toContain("Sitemap: https://ekaya.example/sitemap.xml");
  });

  it("every sitemap page exists as a route", () => {
    const files = readdirSync(new URL("../routes", import.meta.url)).map((f) =>
      f.replace(/\.tsx?$/, ""),
    );
    for (const p of PUBLIC_SITEMAP_PATHS) expect(files).toContain(p.slice(1));
  });
});
