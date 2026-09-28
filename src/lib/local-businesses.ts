import { supabase } from "@/integrations/supabase/client";

/** Public view of an approved business (RLS: anon + authenticated see only status = approved). */
export interface PublicBusiness {
  id: string;
  name: string;
  description: string;
  categoryCode: string | null;
  category: { pt: string; en: string } | null;
  provinceId: string | null;
  province: { pt: string; en: string } | null;
  address: string;
  district: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  email: string;
  website: string;
  image: string | null;
  verified: boolean;
  createdAt: string;
  experienceCount: number;
}

type Json = Record<string, unknown> | null;

function str(obj: unknown, key: string): string {
  if (obj && typeof obj === "object") {
    const v = (obj as Record<string, unknown>)[key];
    if (typeof v === "string") return v.trim();
  }
  return "";
}
function num(obj: unknown, key: string): number | null {
  if (obj && typeof obj === "object") {
    const v = Number((obj as Record<string, unknown>)[key]);
    return Number.isFinite(v) && (obj as Record<string, unknown>)[key] != null ? v : null;
  }
  return null;
}
function one<T>(v: T | T[] | null): T | null {
  return !v ? null : Array.isArray(v) ? (v[0] ?? null) : v;
}

// Only public, business-facing columns — owner_id is never selected.
const SELECT =
  "id, name, description, category_code, province_id, location, contact, images, verified, created_at, business_categories(name_pt, name_en), provinces(name_pt, name_en), experiences(id, active)";

interface Row {
  id: string;
  name: string;
  description: string | null;
  category_code: string | null;
  province_id: string | null;
  location: Json;
  contact: Json;
  images: string[] | null;
  verified: boolean;
  created_at: string;
  business_categories: { name_pt: string; name_en: string } | { name_pt: string; name_en: string }[] | null;
  provinces: { name_pt: string; name_en: string } | { name_pt: string; name_en: string }[] | null;
  experiences: { id: string; active: boolean }[] | null;
}

function map(row: Row): PublicBusiness {
  const cat = one(row.business_categories);
  const prov = one(row.provinces);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    categoryCode: row.category_code,
    category: cat ? { pt: cat.name_pt, en: cat.name_en } : null,
    provinceId: row.province_id,
    province: prov ? { pt: prov.name_pt, en: prov.name_en } : null,
    address: str(row.location, "address"),
    district: str(row.location, "district"),
    lat: num(row.location, "lat"),
    lng: num(row.location, "lng"),
    phone: str(row.contact, "phone"),
    email: str(row.contact, "email"),
    website: str(row.contact, "website"),
    image: row.images?.find((i) => typeof i === "string" && i.startsWith("http")) ?? null,
    verified: row.verified,
    createdAt: row.created_at,
    experienceCount: (row.experiences ?? []).filter((e) => e.active).length,
  };
}

export interface BusinessFilters {
  provinceId?: string;
  categoryCode?: string;
  search?: string;
}

/** Filters run in the database (province/category/name), not on a local list. */
export async function fetchPublicBusinesses(f: BusinessFilters = {}): Promise<PublicBusiness[]> {
  let q = supabase.from("businesses").select(SELECT).eq("status", "approved");
  if (f.provinceId) q = q.eq("province_id", f.provinceId);
  if (f.categoryCode) q = q.eq("category_code", f.categoryCode);
  const s = f.search?.trim().replace(/[%_,()]/g, "");
  if (s) q = q.ilike("name", `%${s}%`);
  const { data, error } = await q.order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => map(r as unknown as Row));
}

export async function fetchPublicBusiness(id: string): Promise<PublicBusiness | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select(SELECT)
    .eq("status", "approved")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? map(data as unknown as Row) : null;
}
