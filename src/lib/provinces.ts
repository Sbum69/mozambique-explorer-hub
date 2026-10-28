import { supabase } from "@/integrations/supabase/client";

/** Province of Mozambique, now a real row instead of free text. */
export interface Province {
  id: string;
  code: string;
  name: { pt: string; en: string };
  active: boolean;
}

/** Closed list of business categories (hotel, restaurant, shop, ...). */
export interface BusinessCategory {
  code: string;
  name: { pt: string; en: string };
  active: boolean;
  sortOrder: number;
}

export async function fetchProvinces(includeInactive = false): Promise<Province[]> {
  let query = supabase
    .from("provinces")
    .select("id, code, name_pt, name_en, active")
    .order("name_pt");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: { pt: row.name_pt, en: row.name_en },
    active: row.active,
  }));
}

export async function fetchBusinessCategories(): Promise<BusinessCategory[]> {
  const { data, error } = await supabase
    .from("business_categories")
    .select("code, name_pt, name_en, active, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    code: row.code,
    name: { pt: row.name_pt, en: row.name_en },
    active: row.active,
    sortOrder: row.sort_order,
  }));
}

/** Admin-only writes; RLS rejects everyone else. */
export async function createProvince(input: { code: string; namePt: string; nameEn: string }) {
  const { error } = await supabase.from("provinces").insert({
    code: input.code,
    name_pt: input.namePt,
    name_en: input.nameEn,
  });
  if (error) throw new Error(error.message);
}

export async function setProvinceActive(id: string, active: boolean) {
  const { error } = await supabase.from("provinces").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}
