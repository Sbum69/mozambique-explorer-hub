import { createFileRoute } from "@tanstack/react-router";

import { sitemapXml } from "@/lib/seo";
import { sitemapDetailEntries } from "@/lib/sitemap-entries";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const details = await sitemapDetailEntries().catch(() => []);
        return new Response(sitemapXml(details), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
