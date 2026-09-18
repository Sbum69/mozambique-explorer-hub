import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BY_SLUG } from "@/lib/destinations";

export type ExperienceCategory = "beach" | "culture" | "food" | "nature" | "community" | "adventure";

const CATEGORY_VALUES: ExperienceCategory[] = [
  "beach",
  "culture",
  "food",
  "nature",
  "community",
  "adventure",
];

export interface Experience {
  /** Real database identifier (uuid). Canonical reference. */
  id: string;
  /** Stable human key, kept for features that still store local references. */
  slug: string;
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  location: string;
  /** Destination slug — used by the existing province/destination filters. */
  destinationId: string | null;
  /** Real destination identifier (uuid) from the destinations table. */
  destinationUuid: string | null;
  destinationName: string | null;
  province: string | null;
  image: string;
  category: ExperienceCategory;
  durationHours: number;
  priceMzn: number;
  capacity: number | null;
  rating: number;
  reviews: number;
  /** Business that runs the experience. */
  host: string;
  businessId: string;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedPeople: number;
  remainingCapacity: number;
  available: boolean;
}

interface ExperienceRow {
  id: string;
  slug: string | null;
  business_id: string;
  destination_id: string | null;
  title_pt: string;
  title_en: string | null;
  description_pt: string | null;
  description_en: string | null;
  province: string | null;
  location: string | null;
  category: string | null;
  price_mzn: number | string;
  duration_hours: number | string | null;
  capacity: number | null;
  rating: number | string | null;
  reviews: number | null;
  images: string[] | null;
  businesses: { name: string } | { name: string }[] | null;
  destinations: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Single place where database columns become the shape the UI already uses. */
export function mapExperience(row: ExperienceRow): Experience {
  const titlePt = row.title_pt;
  const descriptionPt = row.description_pt ?? "";
  const destination = first(row.destinations);
  const business = first(row.businesses);
  const category = (CATEGORY_VALUES as string[]).includes(row.category ?? "")
    ? (row.category as ExperienceCategory)
    : "community";

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: { pt: titlePt, en: row.title_en ?? titlePt },
    description: { pt: descriptionPt, en: row.description_en ?? descriptionPt },
    location: row.location ?? destination?.name ?? row.province ?? "",
    destinationId: destination?.slug ?? null,
    destinationUuid: row.destination_id,
    destinationName: destination?.name ?? null,
    province: row.province,
    image:
      (destination ? IMAGE_BY_SLUG[destination.slug] : undefined) ?? row.images?.[0] ?? "",
    category,
    durationHours: Number(row.duration_hours ?? 0),
    priceMzn: Number(row.price_mzn ?? 0),
    capacity: row.capacity,
    rating: Number(row.rating ?? 0),
    reviews: row.reviews ?? 0,
    host: business?.name ?? "",
    businessId: row.business_id,
  };
}

const SELECT =
  "id, slug, business_id, destination_id, title_pt, title_en, description_pt, description_en, province, location, category, price_mzn, duration_hours, capacity, rating, reviews, images, businesses(name), destinations(slug, name)";

/** Public catalogue of active experiences (RLS allows anon + authenticated reads). */
export async function fetchExperiences(): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select(SELECT)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapExperience(row as unknown as ExperienceRow));
}

/** Single experience by its real identifier. */
export async function fetchExperienceById(id: string): Promise<Experience | null> {
  const { data, error } = await supabase
    .from("experiences")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapExperience(data as unknown as ExperienceRow) : null;
}

/** Experiences of one destination, by the destination's real identifier. */
export async function fetchExperiencesByDestination(destinationId: string): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select(SELECT)
    .eq("active", true)
    .eq("destination_id", destinationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapExperience(row as unknown as ExperienceRow));
}

/**
 * Availability windows for one experience on a given date, straight from the database
 * function that already knows the capacity and the seats taken.
 */
export async function fetchAvailability(
  experienceId: string,
  date: string,
): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase.rpc("get_experience_availability", {
    _experience_id: experienceId,
    _date: date,
  });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    date: row.date as string,
    startTime: (row.start_time as string).slice(0, 5),
    endTime: (row.end_time as string).slice(0, 5),
    capacity: Number(row.capacity ?? 0),
    bookedPeople: Number(row.booked_people ?? 0),
    remainingCapacity: Number(row.remaining_capacity ?? 0),
    available: Boolean(row.available),
  }));
}

/** Experiences owned by the signed-in business (RLS returns only its own rows). */
export async function fetchOwnExperiences(): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select(SELECT)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapExperience(row as unknown as ExperienceRow));
}
