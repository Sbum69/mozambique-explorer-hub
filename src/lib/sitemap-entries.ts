import { supabase } from "@/integrations/supabase/client";
import type { SitemapEntry } from "@/lib/seo";

/**
 * Public detail pages for sitemap.xml, read with the visitor's (anon) rights: only what anyone
 * can already open. A failed query leaves its group out; the static pages are always listed.
 */
export async function sitemapDetailEntries(): Promise<SitemapEntry[]> {
  const [routes, businesses, experiences] = await Promise.all([
    supabase
      .from("routes")
      .select("id, updated_at")
      .eq("is_public", true)
      .eq("review_status", "approved")
      .eq("status", "active"),
    supabase.from("businesses").select("id, updated_at").eq("status", "approved"),
    supabase
      .from("experiences")
      .select("id, updated_at, businesses!inner(status)")
      .eq("businesses.status", "approved"),
  ]);
  const out: SitemapEntry[] = [];
  for (const r of routes.error ? [] : (routes.data ?? []))
    out.push({ path: `/itinerary/${r.id}`, lastmod: r.updated_at });
  for (const b of businesses.error ? [] : (businesses.data ?? []))
    out.push({ path: `/business/${b.id}`, lastmod: b.updated_at });
  for (const e of experiences.error ? [] : (experiences.data ?? []))
    out.push({ path: `/experience/${e.id}`, lastmod: e.updated_at });
  return out;
}
