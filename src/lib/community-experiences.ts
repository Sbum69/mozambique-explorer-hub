import { supabase } from "@/integrations/supabase/client";

/** Free, no-booking leisure activities. Separate from business experiences (public.experiences). */
export type CommunityCategory = "beach" | "culture" | "food" | "nature" | "community" | "adventure";

export const COMMUNITY_CATEGORIES: {
  id: CommunityCategory | "all";
  emoji: string;
  label: { pt: string; en: string };
}[] = [
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
  imagePath: string | null;
  active: boolean;
  status: CommunityStatus;
  submittedBy: string | null;
  submitterName: string | null;
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  additionalInfo: string | null;
}

export type CommunityStatus = "pending" | "approved" | "rejected";
export const COMMUNITY_PHOTOS_BUCKET = "community-photos";

const SELECT =
  "id, title_pt, title_en, description_pt, description_en, province_id, category, location, lat, lng, image_url, image_path, active, status, submitted_by, submitted_at, decided_at, rejection_reason, additional_info, provinces(code, name_pt, name_en)";

export interface CommunityExperienceRow {
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
  image_path: string | null;
  active: boolean;
  status: string;
  submitted_by: string | null;
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
  additional_info: string | null;
  provinces:
    | { code: string; name_pt: string; name_en: string }
    | { code: string; name_pt: string; name_en: string }[]
    | null;
}

export function mapCommunityExperience(row: CommunityExperienceRow): CommunityExperience {
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
    imagePath: row.image_path || null,
    active: row.active,
    status: row.status as CommunityStatus,
    submittedBy: row.submitted_by,
    submitterName: null,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    rejectionReason: row.rejection_reason,
    additionalInfo: row.additional_info,
  };
}

export interface CommunityFilters {
  provinceId?: string;
  category?: CommunityCategory;
  search?: string;
  includeInactive?: boolean;
  /** Admin only. Public reads are always approved + active. */
  status?: CommunityStatus | "any";
  mine?: string;
}

/** Private bucket: photos are shown through short-lived signed URLs (storage RLS decides who may read). */
async function withSignedImages(items: CommunityExperience[]): Promise<CommunityExperience[]> {
  const paths = items.map((i) => i.imagePath).filter((p): p is string => !!p);
  if (!paths.length) return items;
  const { data } = await supabase.storage
    .from(COMMUNITY_PHOTOS_BUCKET)
    .createSignedUrls(paths, 3600);
  const byPath = new Map(
    (data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]),
  );
  return items.map((i) =>
    i.imagePath && byPath.get(i.imagePath) ? { ...i, imageUrl: byPath.get(i.imagePath)! } : i,
  );
}

export async function uploadCommunityPhoto(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("invalid_type");
  if (file.size > 5 * 1024 * 1024) throw new Error("too_large");
  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(COMMUNITY_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Filters run in the database. Inactive rows are only returned to admins (RLS). */
export async function fetchCommunityExperiences(
  f: CommunityFilters = {},
): Promise<CommunityExperience[]> {
  let q = supabase.from("community_experiences").select(SELECT).order("title_pt");
  if (f.mine) q = q.eq("submitted_by", f.mine);
  else {
    if (!f.includeInactive) q = q.eq("active", true);
    const st = f.status ?? "approved";
    if (st !== "any") q = q.eq("status", st);
  }
  if (f.provinceId) q = q.eq("province_id", f.provinceId);
  if (f.category) q = q.eq("category", f.category);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%,()]/g, " ");
    q = q.or(`title_pt.ilike.%${s}%,title_en.ilike.%${s}%,location.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let items = (data ?? []).map((r) =>
    mapCommunityExperience(r as unknown as CommunityExperienceRow),
  );
  if (f.status === "any") {
    // Admin view: submitter names (profiles RLS decides; falls back to the id when unreadable).
    const ids = [...new Set(items.map((i) => i.submittedBy).filter((x): x is string => !!x))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      const names = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      items = items.map((i) => ({
        ...i,
        submitterName: (i.submittedBy && names.get(i.submittedBy)) || null,
      }));
    }
  }
  return withSignedImages(items);
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
  imagePath?: string | null;
  additionalInfo?: string | null;
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
    image_path: i.imagePath ?? null,
    additional_info: i.additionalInfo?.trim() || null,
  };
}

/** Admin-only writes; RLS rejects everyone else. */
export async function createCommunityExperience(i: CommunityInput) {
  const { error } = await supabase.from("community_experiences").insert(toRow(i));
  if (error) throw new Error(error.message);
}
/** Tourist/business proposal: the database forces status=pending and submitted_by=auth.uid(). */
export async function submitCommunityExperience(userId: string, i: CommunityInput) {
  const { error } = await supabase
    .from("community_experiences")
    .insert({ ...toRow(i), image_url: null, status: "pending", submitted_by: userId });
  if (error) throw new Error(error.message);
}
export async function decideCommunityExperience(
  id: string,
  status: "approved" | "rejected",
  reason?: string,
) {
  const { error } = await supabase
    .from("community_experiences")
    .update({ status, rejection_reason: status === "rejected" ? reason?.trim() || null : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function updateCommunityExperience(id: string, i: CommunityInput) {
  const row = toRow(i);
  if (i.imagePath === undefined) delete (row as Partial<typeof row>).image_path;
  const { error } = await supabase.from("community_experiences").update(row).eq("id", id);
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
