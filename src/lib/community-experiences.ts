import { supabase } from "@/integrations/supabase/client";

/** Free, no-booking leisure activities. Separate from business experiences (public.experiences). */
export type CommunityCategory = "beach" | "culture" | "food" | "nature" | "community" | "adventure";

export const COMMUNITY_CATEGORIES: { id: CommunityCategory | "all"; emoji: string; label: { pt: string; en: string } }[] = [
  { id: "all", emoji: "✨", label: { pt: "Todas", en: "All" } },
  { id: "beach", emoji: "🏖️", label: { pt: "Praia", en: "Beach" } },
  { id: "culture", emoji: "🎨", label: { pt: "Cultura", en: "Culture" } },
  { id: "food", emoji: "🍽️", label: { pt: "Gastronomia", en: "Food" } },
  { id: "nature", emoji: "🌿", label: { pt: "Natureza", en: "Nature" } },
  { id: "community", emoji: "👥", label: { pt: "Comunidade", en: "Community" } },
  { id: "adventure", emoji: "🏃", label: { pt: "Aventura", en: "Adventure" } },
];

export function categoryMeta(id: string) {
  return COMMUNITY_CATEGORIES.find((c) => c.id === id) ?? COMMUNITY_CATEGORIES[0];
}

export interface CommunityExperience {
  id: string;
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  provinceId: string;
  provinceCode: string;
  provinceName: { pt: string; en: string };
  category: CommunityCategory;
  location: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  active: boolean;
}

const SELECT =
  "id, title_pt, title_en, description_pt, description_en, province_id, category, location, lat, lng, image_url, active, provinces(code, name_pt, name_en)";

interface Row {
  id: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  province_id: string;
  category: string;
  location: string;
  lat: number | string | null;
  lng: number | string | null;
  image_url: string | null;
  active: boolean;
  provinces: { code: string; name_pt: string; name_en: string } | { code: string; name_pt: string; name_en: string }[] | null;
}

function map(row: Row): CommunityExperience {
  const p = Array.isArray(row.provinces) ? row.provinces[0] : row.provinces;
  return {
    id: row.id,
    title: { pt: row.title_pt, en: row.title_en || row.title_pt },
    description: { pt: row.description_pt, en: row.description_en || row.description_pt },
    provinceId: row.province_id,
    provinceCode: p?.code ?? "",
    provinceName: { pt: p?.name_pt ?? "", en: p?.name_en ?? "" },
    category: row.category as CommunityCategory,
    location: row.location,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    imageUrl: row.image_url || null,
    active: row.active,
  };
}

export interface CommunityFilters {
  provinceId?: string;
  category?: CommunityCategory;
  search?: string;
  includeInactive?: boolean;
}

/** Filters run in the database. Inactive rows are only returned to admins (RLS). */
export async function fetchCommunityExperiences(f: CommunityFilters = {}): Promise<CommunityExperience[]> {
  let q = supabase.from("community_experiences").select(SELECT).order("title_pt");
  if (!f.includeInactive) q = q.eq("active", true);
  if (f.provinceId) q = q.eq("province_id", f.provinceId);
  if (f.category) q = q.eq("category", f.category);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%,()]/g, " ");
    q = q.or(`title_pt.ilike.%${s}%,title_en.ilike.%${s}%,location.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => map(r as unknown as Row));
}

export interface CommunityInput {
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  provinceId: string;
  category: CommunityCategory;
  location: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
}

function toRow(i: CommunityInput) {
  return {
    title_pt: i.titlePt,
    title_en: i.titleEn,
    description_pt: i.descriptionPt,
    description_en: i.descriptionEn,
    province_id: i.provinceId,
    category: i.category,
    location: i.location,
    lat: i.lat,
    lng: i.lng,
    image_url: i.imageUrl || null,
  };
}

/** Admin-only writes; RLS rejects everyone else. */
export async function createCommunityExperience(i: CommunityInput) {
  const { error } = await supabase.from("community_experiences").insert(toRow(i));
  if (error) throw new Error(error.message);
}
export async function updateCommunityExperience(id: string, i: CommunityInput) {
  const { error } = await supabase.from("community_experiences").update(toRow(i)).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function setCommunityExperienceActive(id: string, active: boolean) {
  const { error } = await supabase.from("community_experiences").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteCommunityExperience(id: string) {
  const { error } = await supabase.from("community_experiences").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
