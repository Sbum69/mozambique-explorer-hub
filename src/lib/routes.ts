import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BY_SLUG } from "@/lib/destinations";
import type { TablesInsert } from "@/integrations/supabase/types";

/**
 * Itineraries ("roteiros") live in the database: routes -> route_days -> route_stops.
 * Every stop references a real destinations.id or experiences.id row — there is no
 * free-text place, so nothing shown here can be invented.
 */

/** "experience" = business activity (public.experiences); "community" = public.community_experiences. */
export type RouteStopKind = "destination" | "experience" | "community" | "custom";

/** One reusable cover per province (bundled real photos); others stay neutral until a province image exists. */
const PROVINCE_COVER_SLUG: Record<string, string> = {
  "maputo-cidade": "maputo", maputo: "maputo", inhambane: "inhambane", sofala: "gorongosa",
  nampula: "ilha-de-mocambique", "cabo-delgado": "pemba",
};
export const ROUTE_PROOFS_BUCKET = "route-proofs";

export interface RouteStop {
  id: string;
  order: number;
  kind: RouteStopKind;
  /** destinations.id or experiences.id */
  refId: string;
  title: string;
  titleEn: string | null;
  slug: string | null;
  description: { pt: string | null; en: string | null };
  location: string | null;
  isFree: boolean | null;
  notes: string | null;
  estimatedDurationMinutes: number | null;
  /** Real coordinates of the destination (experiences inherit their destination's). */
  coords: [number, number] | null;
  image: string;
  /** Only present for experience stops (real price from the experiences table). */
  priceMzn: number | null;
  durationHours: number | null;
  destinationName: string | null;
}

export interface RouteDay {
  id: string;
  dayNumber: number;
  title: string | null;
  titleEn: string | null;
  description: string | null;
  stops: RouteStop[];
}

export interface ItineraryRoute {
  id: string;
  ownerId: string | null;
  ownerName: string | null;
  title: string;
  titleEn: string | null;
  subtitle: { pt: string | null; en: string | null };
  description: string | null;
  descriptionEn: string | null;
  interests: string[];
  intensity: "low" | "medium" | "high" | null;
  reviewStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  submittedAt: string | null;
  sourceRouteId: string | null;
  provinceId: string | null;
  province: { code: string; name: { pt: string; en: string } } | null;
  code: string;
  durationDays: number;
  coverImage: string | null;
  isPublic: boolean;
  isCurated: boolean;
  status: "active" | "inactive";
  createdAt: string;
  days: RouteDay[];
}

interface StopRow {
  id: string;
  stop_order: number;
  notes: string | null;
  estimated_duration_minutes: number | null;
  destination_id: string | null;
  experience_id: string | null;
  community_experience_id: string | null;
  stop_type: string | null;
  custom_title_pt: string | null;
  custom_title_en: string | null;
  description_pt: string | null;
  description_en: string | null;
  location: string | null;
  lat: number | string | null;
  lng: number | string | null;
  is_free: boolean | null;
  community_experiences:
    | { id: string; title_pt: string; title_en: string; description_pt: string; description_en: string; location: string; lat: number | string | null; lng: number | string | null }
    | null;
  destinations:
    | { id: string; slug: string; name: string; lat: number | string | null; lng: number | string | null }
    | null;
  experiences:
    | {
        id: string;
        slug: string | null;
        title_pt: string;
        title_en: string | null;
        price_mzn: number | string | null;
        duration_hours: number | string | null;
        destinations: { slug: string; name: string; lat: number | string | null; lng: number | string | null } | null;
      }
    | null;
}

interface RouteRow {
  id: string;
  owner_id: string | null;
  title: string;
  title_en: string | null;
  subtitle_pt: string | null;
  subtitle_en: string | null;
  description: string | null;
  description_en: string | null;
  interests: string[] | null;
  intensity: string | null;
  review_status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  source_route_id: string | null;
  province_id: string | null;
  unique_code: string;
  duration_days: number;
  cover_image: string | null;
  is_public: boolean;
  is_curated: boolean;
  status: string;
  created_at: string;
  provinces: { code: string; name_pt: string; name_en: string } | null;
  profiles?: { display_name: string | null } | null;
  route_days:
    | {
        id: string;
        day_number: number;
        title: string | null;
        title_en: string | null;
        description: string | null;
        route_stops: StopRow[] | null;
      }[]
    | null;
}

const SELECT = `id, owner_id, title, title_en, subtitle_pt, subtitle_en, description, description_en, interests, intensity,
  review_status, rejection_reason, submitted_at, source_route_id, province_id, unique_code, duration_days, cover_image,
  is_public, is_curated, status, created_at,
  provinces(code, name_pt, name_en),
  route_days(id, day_number, title, title_en, description,
    route_stops(id, stop_order, notes, estimated_duration_minutes, destination_id, experience_id, community_experience_id,
      stop_type, custom_title_pt, custom_title_en, description_pt, description_en, location, lat, lng, is_free,
      community_experiences(id, title_pt, title_en, description_pt, description_en, location, lat, lng),
      destinations(id, slug, name, lat, lng),
      experiences(id, slug, title_pt, title_en, price_mzn, duration_hours, destinations(slug, name, lat, lng))))`;

function coordsOf(lat: unknown, lng: unknown): [number, number] | null {
  if (lat == null || lng == null) return null;
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a === 0 && b === 0)) return null;
  return [a, b];
}

function mapStop(row: StopRow): RouteStop | null {
  const base = {
    id: row.id,
    order: row.stop_order,
    notes: row.notes,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    description: { pt: row.description_pt, en: row.description_en },
    location: row.location,
    isFree: row.is_free,
  };
  if (row.stop_type === "community_experience") {
    const c = row.community_experiences;
    if (!c) return null; // not approved/readable: never invent a link
    return {
      ...base, kind: "community", refId: c.id, title: c.title_pt, titleEn: c.title_en, slug: null,
      description: { pt: row.description_pt ?? c.description_pt, en: row.description_en ?? c.description_en },
      location: row.location ?? c.location, isFree: true,
      coords: coordsOf(c.lat, c.lng), image: "", priceMzn: null, durationHours: null, destinationName: null,
    };
  }
  if (row.stop_type === "custom_stop") {
    if (!row.custom_title_pt) return null;
    return {
      ...base, kind: "custom", refId: row.id, title: row.custom_title_pt, titleEn: row.custom_title_en, slug: null,
      coords: coordsOf(row.lat, row.lng), image: "", priceMzn: null, durationHours: null, destinationName: null,
    };
  }
  if (row.destinations) {
    const d = row.destinations;
    return {
      id: row.id,
      order: row.stop_order,
      ...base,
      kind: "destination",
      refId: d.id,
      title: d.name,
      titleEn: null,
      slug: d.slug,
      coords: coordsOf(d.lat, d.lng),
      image: IMAGE_BY_SLUG[d.slug] ?? "",
      priceMzn: null,
      durationHours: null,
      destinationName: d.name,
    };
  }
  if (row.experiences) {
    const e = row.experiences;
    const dest = e.destinations;
    return {
      id: row.id,
      order: row.stop_order,
      ...base,
      kind: "experience",
      refId: e.id,
      title: e.title_pt,
      titleEn: e.title_en,
      slug: e.slug,
      coords: dest ? coordsOf(dest.lat, dest.lng) : null,
      image: dest ? (IMAGE_BY_SLUG[dest.slug] ?? "") : "",
      priceMzn: e.price_mzn == null ? null : Number(e.price_mzn),
      durationHours: e.duration_hours == null ? null : Number(e.duration_hours),
      destinationName: dest?.name ?? null,
    };
  }
  // Referenced row no longer readable (e.g. experience deactivated): skip instead of inventing one.
  return null;
}

function mapRoute(row: RouteRow): ItineraryRoute {
  const days = (row.route_days ?? [])
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      title: d.title,
      titleEn: d.title_en,
      description: d.description,
      stops: (d.route_stops ?? [])
        .slice()
        .sort((a, b) => a.stop_order - b.stop_order)
        .map(mapStop)
        .filter((s): s is RouteStop => s !== null),
    }));

  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.profiles?.display_name ?? null,
    title: row.title,
    titleEn: row.title_en,
    subtitle: { pt: row.subtitle_pt, en: row.subtitle_en },
    description: row.description,
    descriptionEn: row.description_en,
    interests: row.interests ?? [],
    intensity: (row.intensity as ItineraryRoute["intensity"]) ?? null,
    reviewStatus: (row.review_status as ItineraryRoute["reviewStatus"]) ?? "approved",
    rejectionReason: row.rejection_reason,
    submittedAt: row.submitted_at,
    sourceRouteId: row.source_route_id,
    provinceId: row.province_id,
    province: row.provinces
      ? { code: row.provinces.code, name: { pt: row.provinces.name_pt, en: row.provinces.name_en } }
      : null,
    code: row.unique_code,
    durationDays: row.duration_days,
    coverImage: row.cover_image,
    isPublic: row.is_public,
    isCurated: row.is_curated,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.created_at,
    days,
  };
}

export function routeStopCount(route: ItineraryRoute) {
  return route.days.reduce((total, day) => total + day.stops.length, 0);
}

export function routeAllStops(route: ItineraryRoute) {
  return route.days.flatMap((day) => day.stops);
}

/** Cover falls back to the artwork of the first destination in the route — never an invented image. */
export function routeCover(route: ItineraryRoute): string {
  const slug = route.province ? PROVINCE_COVER_SLUG[route.province.code] : undefined;
  if (slug && IMAGE_BY_SLUG[slug]) return IMAGE_BY_SLUG[slug];
  if (route.province) return ""; // province without image yet: neutral placeholder, no invented image
  const withImage = routeAllStops(route).find((s) => s.image);
  return withImage?.image ?? "";
}

export function routePriceMzn(route: ItineraryRoute): number {
  return routeAllStops(route).reduce((total, s) => total + (s.priceMzn ?? 0), 0);
}

/** Public catalogue (anon + authenticated). */
export async function fetchPublicRoutes(): Promise<ItineraryRoute[]> {
  const { data, error } = await supabase
    .from("routes")
    .select(SELECT)
    .eq("is_public", true)
    .eq("status", "active")
    .eq("review_status", "approved")
    .order("is_curated", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRoute(row as unknown as RouteRow));
}

/** Routes owned by the signed-in user (includes private ones). */
export async function fetchMyRoutes(userId: string): Promise<ItineraryRoute[]> {
  const { data, error } = await supabase
    .from("routes")
    .select(SELECT)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRoute(row as unknown as RouteRow));
}

/** Every route, for the admin panel (RLS grants this only to admins). */
export async function fetchAllRoutesAdmin(): Promise<ItineraryRoute[]> {
  const { data, error } = await supabase
    .from("routes")
    .select(`${SELECT}, profiles:owner_id(display_name)`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRoute(row as unknown as RouteRow));
}

export async function fetchRouteById(id: string): Promise<ItineraryRoute | null> {
  const { data, error } = await supabase.from("routes").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRoute(data as unknown as RouteRow) : null;
}

/** Case-insensitive code lookup. RLS only returns public or own routes. */
export async function fetchRouteByCode(code: string): Promise<ItineraryRoute | null> {
  const normalised = normaliseCode(code);
  const { data, error } = await supabase
    .from("routes")
    .select(SELECT)
    .eq("unique_code", normalised)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRoute(data as unknown as RouteRow) : null;
}

export function normaliseCode(code: string): string {
  const raw = code.trim().toUpperCase().replace(/\s+/g, "");
  return raw.startsWith("EK-") ? raw : `EK-${raw}`;
}

export interface RouteDayInput {
  title?: string | null;
  titleEn?: string | null;
  stops: { kind: RouteStopKind; refId: string; notes?: string | null; estimatedDurationMinutes?: number | null }[];
}

export interface RouteInput {
  title: string;
  titleEn?: string | null;
  subtitlePt?: string | null;
  subtitleEn?: string | null;
  description: string | null;
  descriptionEn?: string | null;
  interests?: string[];
  intensity?: "low" | "medium" | "high" | null;
  provinceId: string | null;
  isPublic: boolean;
  sourceRouteId?: string | null;
  customCode?: string | null;
  days: RouteDayInput[];
}

async function writeDays(routeId: string, days: RouteDayInput[]) {
  for (const [index, day] of days.entries()) {
    const { data: dayRow, error: dayError } = await supabase
      .from("route_days")
      .insert({ route_id: routeId, day_number: index + 1, title: day.title ?? null, title_en: day.titleEn ?? null })
      .select("id")
      .single();
    if (dayError) throw new Error(dayError.message);
    if (day.stops.length === 0) continue;
    const { error: stopError } = await supabase.from("route_stops").insert(
      day.stops.map((stop, order) => ({
        route_day_id: dayRow.id,
        stop_order: order + 1,
        stop_type: stop.kind === "experience" ? "activity" : stop.kind === "community" ? "community_experience" : "destination",
        destination_id: stop.kind === "destination" ? stop.refId : null,
        experience_id: stop.kind === "experience" ? stop.refId : null,
        community_experience_id: stop.kind === "community" ? stop.refId : null,
        notes: stop.notes ?? null,
        estimated_duration_minutes: stop.estimatedDurationMinutes ?? null,
      })),
    );
    if (stopError) throw new Error(stopError.message);
  }
}

/** Creates a route owned by the signed-in user. The code is generated by the database. */
export async function createRoute(
  input: RouteInput,
  ownerId: string,
  options: { isCurated?: boolean } = {},
): Promise<ItineraryRoute> {
  const payload = {
    owner_id: options.isCurated ? null : ownerId,
    title: input.title,
    title_en: input.titleEn ?? null,
    subtitle_pt: input.subtitlePt ?? null,
    subtitle_en: input.subtitleEn ?? null,
    description: input.description,
    description_en: input.descriptionEn ?? null,
    interests: input.interests ?? [],
    intensity: input.intensity ?? null,
    source_route_id: input.sourceRouteId ?? null,
    province_id: input.provinceId,
    duration_days: Math.max(1, input.days.length),
    is_public: input.isPublic,
    is_curated: options.isCurated ?? false,
  } as {
    [k: string]: unknown;
    owner_id: string | null;
    title: string;
    description: string | null;
    province_id: string | null;
    duration_days: number;
    is_public: boolean;
    is_curated: boolean;
    unique_code?: string;
  };
  if (input.customCode) payload.unique_code = normaliseCode(input.customCode);

  // unique_code is filled by a database trigger when omitted.
  const { data, error } = await supabase
    .from("routes")
    .insert(payload as unknown as TablesInsert<"routes">)
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      throw new Error("DUPLICATE_CODE");
    }
    if (/routes_code_format/.test(error.message)) throw new Error("INVALID_CODE");
    throw new Error(error.message);
  }
  await writeDays(data.id, input.days);
  const created = await fetchRouteById(data.id);
  if (!created) throw new Error("Route created but not readable");
  return created;
}

/** Replaces the days/stops of a route the user owns (admin can edit curated ones). */
export async function updateRoute(routeId: string, input: RouteInput): Promise<ItineraryRoute> {
  const { error } = await supabase
    .from("routes")
    .update({
      title: input.title,
      title_en: input.titleEn ?? null,
      subtitle_pt: input.subtitlePt ?? null,
      subtitle_en: input.subtitleEn ?? null,
      description_en: input.descriptionEn ?? null,
      interests: input.interests ?? [],
      intensity: input.intensity ?? null,
      description: input.description,
      province_id: input.provinceId,
      duration_days: Math.max(1, input.days.length),
      is_public: input.isPublic,
    })
    .eq("id", routeId);
  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase.from("route_days").delete().eq("route_id", routeId);
  if (deleteError) throw new Error(deleteError.message);
  await writeDays(routeId, input.days);

  const updated = await fetchRouteById(routeId);
  if (!updated) throw new Error("Route not readable after update");
  return updated;
}

export async function deleteRoute(routeId: string) {
  const { error } = await supabase.from("routes").delete().eq("id", routeId);
  if (error) throw new Error(error.message);
}

export async function setRouteStatus(routeId: string, status: "active" | "inactive") {
  const { error } = await supabase.from("routes").update({ status }).eq("id", routeId);
  if (error) throw new Error(error.message);
}

/** Admin decision; the database stamps decided_at/by and notifies the author. */
export async function decideRoute(routeId: string, decision: "approved" | "rejected", reason?: string) {
  const { error } = await supabase
    .from("routes")
    .update({ review_status: decision, rejection_reason: decision === "rejected" ? reason?.trim() || null : null })
    .eq("id", routeId);
  if (error) throw new Error(error.message);
}

export async function setRouteVisibility(routeId: string, isPublic: boolean) {
  const { error } = await supabase.from("routes").update({ is_public: isPublic }).eq("id", routeId);
  if (error) throw new Error(error.message);
}

/**
 * Importing copies a public route into the user's account. The original row is untouched
 * and keeps its owner; the copy is private and references the same real stops.
 */
export async function importRouteByCode(code: string, ownerId: string): Promise<ItineraryRoute> {
  const source = await fetchRouteByCode(code);
  if (!source) throw new Error("NOT_FOUND");
  if (!source.isPublic || source.status !== "active") {
    if (source.ownerId !== ownerId) throw new Error("NOT_FOUND");
  }
  if (source.ownerId === ownerId) throw new Error("ALREADY_OWN");
  const { data: existing } = await supabase
    .from("routes").select("id").eq("owner_id", ownerId).eq("source_route_id", source.id).maybeSingle();
  if (existing) throw new Error("ALREADY_IMPORTED");

  return createRoute(
    {
      title: source.title,
      titleEn: source.titleEn,
      subtitlePt: source.subtitle.pt,
      subtitleEn: source.subtitle.en,
      description: source.description,
      descriptionEn: source.descriptionEn,
      interests: source.interests,
      intensity: source.intensity,
      sourceRouteId: source.id,
      provinceId: source.provinceId,
      isPublic: false,
      days: source.days.map((day) => ({
        title: day.title,
        titleEn: day.titleEn,
        stops: day.stops.filter((stop) => stop.kind !== "custom").map((stop) => ({
          kind: stop.kind,
          refId: stop.refId,
          notes: stop.notes,
          estimatedDurationMinutes: stop.estimatedDurationMinutes,
        })),
      })),
    },
    ownerId,
  );
}

// ---------- progress (per account, not per browser) ----------

export interface RouteProgress {
  id: string;
  routeId: string;
  currentDay: number;
  status: "in_progress" | "completed";
  startedAt: string;
  completedAt: string | null;
  completedStopIds: string[];
  /** route_stop_id -> private photo path */
  proofPaths: Record<string, string>;
}

function mapProgress(row: {
  id: string;
  route_id: string;
  current_day: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  route_stop_progress: { route_stop_id: string; photo_path: string | null }[] | null;
}): RouteProgress {
  return {
    id: row.id,
    routeId: row.route_id,
    currentDay: row.current_day,
    status: row.status === "completed" ? "completed" : "in_progress",
    startedAt: row.started_at,
    completedAt: row.completed_at,
    completedStopIds: (row.route_stop_progress ?? []).map((s) => s.route_stop_id),
    proofPaths: Object.fromEntries((row.route_stop_progress ?? []).filter((s) => s.photo_path).map((s) => [s.route_stop_id, s.photo_path as string])),
  };
}

const PROGRESS_SELECT =
  "id, route_id, current_day, status, started_at, completed_at, route_stop_progress(route_stop_id, photo_path)";

export async function fetchRouteProgress(routeId: string, userId: string): Promise<RouteProgress | null> {
  const { data, error } = await supabase
    .from("route_progress")
    .select(PROGRESS_SELECT)
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProgress(data as never) : null;
}

export async function startRouteProgress(routeId: string, userId: string): Promise<RouteProgress> {
  const existing = await fetchRouteProgress(routeId, userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("route_progress")
    .insert({ route_id: routeId, user_id: userId })
    .select(PROGRESS_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapProgress(data as never);
}

/** Photo proof is mandatory: upload to the user's private folder first, then pass the path. */
export async function uploadStopProof(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("invalid_type");
  if (file.size > 8 * 1024 * 1024) throw new Error("too_large");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ROUTE_PROOFS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function proofUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(ROUTE_PROOFS_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function toggleStopCompleted(
  progressId: string,
  stopId: string,
  completed: boolean,
  proof?: { photoPath: string; lat?: number | null; lng?: number | null },
) {
  if (completed) {
    if (!proof?.photoPath) throw new Error("PHOTO_REQUIRED");
    const { error } = await supabase
      .from("route_stop_progress")
      .insert({ progress_id: progressId, route_stop_id: stopId, photo_path: proof.photoPath, lat: proof.lat ?? null, lng: proof.lng ?? null });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("route_stop_progress")
      .delete()
      .eq("progress_id", progressId)
      .eq("route_stop_id", stopId);
    if (error) throw new Error(error.message);
  }
}

export async function setProgressDay(progressId: string, day: number) {
  const { error } = await supabase
    .from("route_progress")
    .update({ current_day: day })
    .eq("id", progressId);
  if (error) throw new Error(error.message);
}

export async function finishRouteProgress(progressId: string) {
  const { error } = await supabase
    .from("route_progress")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", progressId);
  if (error) throw new Error(error.message);
}

export async function resetRouteProgress(progressId: string) {
  const { error: stopError } = await supabase
    .from("route_stop_progress")
    .delete()
    .eq("progress_id", progressId);
  if (stopError) throw new Error(stopError.message);
  const { error } = await supabase
    .from("route_progress")
    .update({ status: "in_progress", completed_at: null, current_day: 1 })
    .eq("id", progressId);
  if (error) throw new Error(error.message);
}
