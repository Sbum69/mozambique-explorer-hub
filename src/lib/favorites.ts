import { supabase } from "@/integrations/supabase/client";
import { fetchDestinations } from "@/lib/destinations";
import { fetchExperienceById } from "@/lib/experiences";
import { fetchRouteById, routeCover } from "@/lib/routes";

/**
 * Favourites live in public.favorites (RLS: own rows only; a trigger refuses items that don't exist
 * or that the user can't see). Item details are read live, never stored as a snapshot.
 */

export const FAVORITE_TYPES = ["place", "experience", "itinerary"] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];

export interface FavoriteRef {
  type: FavoriteType;
  id: string;
}

export interface FavoriteRow extends FavoriteRef {
  savedDate: string;
}

/** Display data resolved from the live tables; `unavailable` when the item was removed or hidden. */
export interface FavoriteData {
  title?: string | { pt: string; en: string };
  name?: string;
  description?: string | { pt: string; en: string };
  image?: string;
  location?: string;
  region?: { pt: string; en: string };
  rating?: number;
  priceMzn?: number;
  durationDays?: number;
  unavailable?: boolean;
}

export const isFavoriteType = (t: unknown): t is FavoriteType =>
  typeof t === "string" && (FAVORITE_TYPES as readonly string[]).includes(t);

export const favoriteKey = (type: FavoriteType, id: string) => `${type}:${id}`;

export async function fetchMyFavorites(): Promise<FavoriteRow[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("item_type, item_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r) => isFavoriteType(r.item_type))
    .map((r) => ({ type: r.item_type as FavoriteType, id: r.item_id, savedDate: r.created_at }));
}

/** Adding twice is not an error: the second insert is ignored (unique per user, type and item). */
export async function addFavoriteRow(ref: FavoriteRef): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .upsert(
      { item_type: ref.type, item_id: ref.id },
      { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeFavoriteRow(ref: FavoriteRef): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("item_type", ref.type)
    .eq("item_id", ref.id);
  if (error) throw new Error(error.message);
}

/** Reads the current details of each favourite from the same sources the app uses everywhere else. */
export async function resolveFavoriteData(
  rows: FavoriteRef[],
): Promise<Record<string, FavoriteData>> {
  const out: Record<string, FavoriteData> = {};
  const places = rows.filter((r) => r.type === "place");
  const destinations = places.length ? await fetchDestinations() : [];
  for (const p of places) {
    const d = destinations.find((x) => x.slug === p.id);
    out[favoriteKey("place", p.id)] = d
      ? { name: d.name, description: d.description, image: d.image, region: d.region }
      : { unavailable: true };
  }
  await Promise.all(
    rows
      .filter((r) => r.type !== "place")
      .map(async (r) => {
        try {
          if (r.type === "experience") {
            const e = await fetchExperienceById(r.id);
            out[favoriteKey(r.type, r.id)] = e
              ? {
                  title: e.title,
                  description: e.description,
                  image: e.image,
                  location: e.location,
                  rating: e.rating,
                  priceMzn: e.priceMzn,
                }
              : { unavailable: true };
          } else {
            const route = await fetchRouteById(r.id);
            out[favoriteKey(r.type, r.id)] = route
              ? {
                  name: route.title,
                  description: route.description ?? "",
                  image: routeCover(route),
                  location: route.code,
                  durationDays: route.durationDays,
                }
              : { unavailable: true };
          }
        } catch {
          out[favoriteKey(r.type, r.id)] = { unavailable: true };
        }
      }),
  );
  return out;
}

// ---------- One-time import of the old browser-only favourites ----------

export const LEGACY_FAVORITES_KEY = "ekaya_favorites";

/** Valid references from the old localStorage value; anything malformed or of an unsupported type is dropped. */
export function parseLegacyFavorites(raw: string | null): FavoriteRef[] {
  if (!raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: FavoriteRef[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { id, type } = item as { id?: unknown; type?: unknown };
    if (!isFavoriteType(type) || typeof id !== "string" || !id.trim() || id.length > 100) continue;
    const key = favoriteKey(type, id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
  }
  return out;
}

export interface LegacyImportResult {
  imported: number;
  rejected: number;
  failed: number;
  cleared: boolean;
}

/**
 * Imports the old favourites one by one. Items the server refuses (ITEM_NOT_FOUND: removed or not visible)
 * are dropped; the local copy is deleted only when nothing failed for another reason (e.g. offline),
 * so a later login can retry.
 */
export async function importLegacyFavorites(
  storage: Pick<Storage, "getItem" | "removeItem">,
  add: (ref: FavoriteRef) => Promise<void> = addFavoriteRow,
): Promise<LegacyImportResult> {
  const refs = parseLegacyFavorites(storage.getItem(LEGACY_FAVORITES_KEY));
  let imported = 0;
  let rejected = 0;
  let failed = 0;
  for (const ref of refs) {
    try {
      await add(ref);
      imported++;
    } catch (e) {
      if (e instanceof Error && e.message.includes("ITEM_NOT_FOUND")) rejected++;
      else failed++;
    }
  }
  const cleared = failed === 0 && storage.getItem(LEGACY_FAVORITES_KEY) !== null;
  if (failed === 0) storage.removeItem(LEGACY_FAVORITES_KEY);
  return { imported, rejected, failed, cleared };
}
