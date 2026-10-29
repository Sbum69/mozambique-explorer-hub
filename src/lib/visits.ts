import { supabase } from "@/integrations/supabase/client";

/**
 * Destination visits of the signed-in user (RLS: own rows only).
 * No GPS is stored — only user, destination and time. Future gamification can read these rows.
 */
export async function fetchMyVisits(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("destination_visits")
    .select("destination_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.destination_id as string));
}

export async function addVisit(userId: string, destinationId: string) {
  const { error } = await supabase
    .from("destination_visits")
    .upsert(
      { user_id: userId, destination_id: destinationId },
      { onConflict: "user_id,destination_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeVisit(userId: string, destinationId: string) {
  const { error } = await supabase
    .from("destination_visits")
    .delete()
    .eq("user_id", userId)
    .eq("destination_id", destinationId);
  if (error) throw new Error(error.message);
}

/** Coordinates are valid only when they are real numbers inside lat/lng bounds and not the 0,0 placeholder. */
export function hasValidCoords(c: [number, number] | null | undefined): c is [number, number] {
  if (!c) return false;
  const [lat, lng] = c;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function directionsUrls([lat, lng]: [number, number]) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lng}`,
    waze: `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  };
}
