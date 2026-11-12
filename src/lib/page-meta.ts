import { supabase } from "@/integrations/supabase/client";

/**
 * Title and description of public detail pages, read on the server (route loaders with
 * ssr: "data-only") so search engines and link previews see the real name in the HTML.
 * Only public rows are visible (RLS for anon); any error returns null and the page keeps its
 * generic title. Never invents text: an empty description falls back to the generic one.
 */
export interface PageMeta {
  title: string;
  description: string | null;
  /** schema.org JSON-LD (already serialised), built only from the row's own data. */
  jsonLd?: string;
}

const ORIGIN = "https://exploreekaya.com";

interface TripStopRow {
  stop_order: number;
  stop_type: string | null;
  custom_title_pt: string | null;
  lat: number | string | null;
  lng: number | string | null;
  destinations: { name: string; lat: number | string | null; lng: number | string | null } | null;
}

/** TouristTrip for a public route: its places in order, with coordinates when the row has them. */
export function routeJsonLd(
  id: string,
  row: {
    title: string;
    description: string | null;
    duration_days: number;
    route_days?: { day_number: number; route_stops: TripStopRow[] | null }[] | null;
  },
): string {
  const places = (row.route_days ?? [])
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .flatMap((d) => (d.route_stops ?? []).slice().sort((a, b) => a.stop_order - b.stop_order))
    .filter((s) => s.stop_type !== "travel")
    .flatMap((s) => {
      const name = s.destinations?.name ?? s.custom_title_pt;
      if (!name) return [];
      const lat = Number(s.destinations ? s.destinations.lat : s.lat);
      const lng = Number(s.destinations ? s.destinations.lng : s.lng);
      const geo =
        Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
          ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } }
          : {};
      return [{ "@type": "Place", name, ...geo }];
    });
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: row.title,
    ...(row.description ? { description: clip(row.description, 300) } : {}),
    url: `${ORIGIN}/itinerary/${id}`,
    inLanguage: ["pt", "en"],
    provider: { "@type": "Organization", "@id": `${ORIGIN}/#organization`, name: "EKAYA" },
    ...(places.length
      ? {
          itinerary: {
            "@type": "ItemList",
            numberOfItems: places.length,
            itemListElement: places.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item,
            })),
          },
        }
      : {}),
  }).replace(/</g, "\\u003c"); // never closes the <script> tag, whatever the text
}

/** A place as text: the column is plain text on some tables and {address} JSON on others. */
const place = (v: unknown): string | null => {
  if (typeof v === "string") return v.trim() || null;
  if (v && typeof v === "object") {
    const o = v as { address?: unknown; city?: unknown };
    const t = typeof o.city === "string" ? o.city : typeof o.address === "string" ? o.address : "";
    return t.trim() || null;
  }
  return null;
};

const clip = (s: string | null | undefined, max = 160) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

export async function experienceMeta(id: string): Promise<PageMeta | null> {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("title_pt, description_pt, location")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const loc = place(data.location);
    const where = loc ? ` em ${loc}` : "";
    return { title: `${data.title_pt}${where}`, description: clip(data.description_pt) };
  } catch {
    return null;
  }
}

export async function businessMeta(id: string): Promise<PageMeta | null> {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("name, description, location")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const loc = place(data.location);
    const where = loc ? ` · ${loc}` : "";
    return { title: `${data.name}${where}`, description: clip(data.description) };
  } catch {
    return null;
  }
}

export async function routeMeta(id: string): Promise<PageMeta | null> {
  try {
    const { data, error } = await supabase
      .from("routes")
      .select(
        `title, description, duration_days, is_public, review_status, status,
        route_days(day_number, route_stops(stop_order, stop_type, custom_title_pt, lat, lng,
          destinations(name, lat, lng)))`,
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const listed = data.is_public && data.review_status === "approved" && data.status === "active";
    return {
      title: data.title,
      description: clip(data.description),
      ...(listed ? { jsonLd: routeJsonLd(id, data) } : {}),
    };
  } catch {
    return null;
  }
}

/** Head tags for a detail page: the real name when known, otherwise the generic text. */
export function detailHead(
  meta: PageMeta | null | undefined,
  generic: { title: string; description: string },
  type: "website" | "article" = "website",
) {
  const title = meta ? `${meta.title} — EKAYA` : generic.title;
  const description = meta?.description ?? generic.description;
  return {
    ...(meta?.jsonLd ? { scripts: [{ type: "application/ld+json", children: meta.jsonLd }] } : {}),
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
