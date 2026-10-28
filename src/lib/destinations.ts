import { supabase } from "@/integrations/supabase/client";

import maputo from "@/assets/dest-maputo.webp";
import ilha from "@/assets/dest-ilha.webp";
import inhambane from "@/assets/dest-inhambane.webp";
import vilankulo from "@/assets/dest-vilankulo.webp";
import pemba from "@/assets/dest-pemba.webp";
import gorongosa from "@/assets/dest-gorongosa.webp";
import maputoThumb from "@/assets/dest-maputo-thumb.webp";
import ilhaThumb from "@/assets/dest-ilha-thumb.webp";
import inhambaneThumb from "@/assets/dest-inhambane-thumb.webp";
import vilankuloThumb from "@/assets/dest-vilankulo-thumb.webp";
import pembaThumb from "@/assets/dest-pemba-thumb.webp";
import gorongosaThumb from "@/assets/dest-gorongosa-thumb.webp";

export type DestinationBadge = "most-visited" | "most-recommended";

export interface Destination {
  /** Real database identifier (uuid). Canonical reference from now on. */
  id: string;
  /** Stable human key, used by features that are still local (favourites, visits, itinerary map). */
  slug: string;
  name: string;
  province: string;
  category: string | null;
  region: { pt: string; en: string };
  description: { pt: string; en: string };
  image: string;
  /** Small square version (288 px) for lists; same artwork as image. */
  thumbnail: string;
  visitorsK: number;
  badges: DestinationBadge[];
  highlights: { pt: string; en: string }[];
  coords: [number, number]; // [lat, lng]
}

/** Bundled artwork per destination slug; images are shipped with the app, not stored in the database. */
export const IMAGE_BY_SLUG: Record<string, string> = {
  maputo,
  ilha,
  inhambane,
  vilankulo,
  pemba,
  gorongosa,
};

/** 288 px squares of the same artwork, for lists (a few KB instead of ~60 KB). */
const THUMB_BY_SLUG: Record<string, string> = {
  maputo: maputoThumb,
  ilha: ilhaThumb,
  inhambane: inhambaneThumb,
  vilankulo: vilankuloThumb,
  pemba: pembaThumb,
  gorongosa: gorongosaThumb,
};

const BADGES: DestinationBadge[] = ["most-visited", "most-recommended"];

interface DestinationRow {
  id: string;
  slug: string;
  name: string;
  province: string;
  category: string | null;
  lat: number | string | null;
  lng: number | string | null;
  description_pt: string | null;
  description_en: string | null;
  region_pt: string | null;
  region_en: string | null;
  visitors_k: number | null;
  badges: string[] | null;
  highlights: unknown;
  images: string[] | null;
}

function toHighlights(value: unknown): { pt: string; en: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as { pt?: unknown; en?: unknown };
    const pt = typeof item.pt === "string" ? item.pt : "";
    const en = typeof item.en === "string" ? item.en : pt;
    return pt || en ? [{ pt: pt || en, en: en || pt }] : [];
  });
}

/** Single place where database columns are translated into the shape the UI already uses. */
export function mapDestination(row: DestinationRow): Destination {
  const descriptionPt = row.description_pt ?? "";
  const descriptionEn = row.description_en ?? descriptionPt;
  const regionPt = row.region_pt ?? row.province;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    province: row.province,
    category: row.category,
    region: { pt: regionPt, en: row.region_en ?? regionPt },
    description: { pt: descriptionPt, en: descriptionEn },
    image: IMAGE_BY_SLUG[row.slug] ?? row.images?.[0] ?? "",
    thumbnail: THUMB_BY_SLUG[row.slug] ?? IMAGE_BY_SLUG[row.slug] ?? row.images?.[0] ?? "",
    visitorsK: row.visitors_k ?? 0,
    badges: (row.badges ?? []).filter((badge): badge is DestinationBadge =>
      (BADGES as string[]).includes(badge),
    ),
    coords: [Number(row.lat ?? 0), Number(row.lng ?? 0)],
    highlights: toHighlights(row.highlights),
  };
}

/** Reads the destination catalogue from the database (public read, RLS allows anon + authenticated). */
export async function fetchDestinations(): Promise<Destination[]> {
  const { data, error } = await supabase
    .from("destinations")
    .select(
      "id, slug, name, province, category, lat, lng, description_pt, description_en, region_pt, region_en, visitors_k, badges, highlights, images",
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapDestination(row as DestinationRow));
}

export function findDestinationBySlug(list: Destination[], slug?: string | null) {
  if (!slug) return undefined;
  return list.find((d) => d.slug === slug);
}
