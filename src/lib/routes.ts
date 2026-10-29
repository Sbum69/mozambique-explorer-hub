import { supabase } from "@/integrations/supabase/client";
import type { PreciseLocation, ProofReviewStatus } from "@/lib/geo";
import { IMAGE_BY_SLUG } from "@/lib/destinations";
import { provincePhoto } from "@/lib/photo-credits";
import { validMapCoordinate } from "@/lib/itinerary-routing";
import type { Json } from "@/integrations/supabase/types";

/**
 * Itineraries ("roteiros") live in the database: routes -> route_days -> route_stops.
 * Every stop references a real destinations.id or experiences.id row — there is no
 * free-text place, so nothing shown here can be invented.
 */

/** "experience" = business activity (public.experiences); "community" = public.community_experiences. */
export type RouteStopKind = "destination" | "experience" | "community" | "custom";

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
  /** Base-catalogue stop without a linked entity: still needs field validation. */
  pendingValidation: boolean;
  /** Potential community articulation only — never a confirmed community experience. */
  communityCandidate: boolean;
}

export interface RouteDay {
  id: string;
  dayNumber: number;
  title: string | null;
  titleEn: string | null;
  description: string | null;
  /** Stops kept as a sequence; the day-by-day split is not validated yet. */
  isUnassigned: boolean;
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
  requiresValidation: boolean;
  catalogNotes: { pt: string | null; en: string | null };
  communityCandidates: string[];
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
  validation_status?: string | null;
  community_candidate?: boolean | null;
  community_experiences: {
    id: string;
    title_pt: string;
    title_en: string;
    description_pt: string;
    description_en: string;
    location: string;
    lat: number | string | null;
    lng: number | string | null;
  } | null;
  destinations: {
    id: string;
    slug: string;
    name: string;
    lat: number | string | null;
    lng: number | string | null;
  } | null;
  experiences: {
    id: string;
    slug: string | null;
    title_pt: string;
    title_en: string | null;
    price_mzn: number | string | null;
    duration_hours: number | string | null;
    destinations: {
      slug: string;
      name: string;
      lat: number | string | null;
      lng: number | string | null;
    } | null;
  } | null;
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
  requires_validation?: boolean | null;
  catalog_notes_pt?: string | null;
  catalog_notes_en?: string | null;
  community_candidates?: unknown;
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
        is_unassigned?: boolean | null;
        route_stops: StopRow[] | null;
      }[]
    | null;
}

const SELECT = `id, owner_id, title, title_en, subtitle_pt, subtitle_en, description, description_en, interests, intensity,
  review_status, rejection_reason, submitted_at, source_route_id, province_id, unique_code, duration_days, cover_image,
  is_public, is_curated, status, created_at, requires_validation, catalog_notes_pt, catalog_notes_en, community_candidates,
  provinces(code, name_pt, name_en),
  route_days(id, day_number, title, title_en, description, is_unassigned,
    route_stops(id, stop_order, notes, estimated_duration_minutes, destination_id, experience_id, community_experience_id,
      stop_type, custom_title_pt, custom_title_en, description_pt, description_en, location, lat, lng, is_free, validation_status, community_candidate,
      community_experiences(id, title_pt, title_en, description_pt, description_en, location, lat, lng),
      destinations(id, slug, name, lat, lng),
      experiences(id, slug, title_pt, title_en, price_mzn, duration_hours, destinations(slug, name, lat, lng))))`;

function coordsOf(lat: unknown, lng: unknown): [number, number] | null {
  if (lat == null || lng == null) return null;
  const a = Number(lat);
  const b = Number(lng);
  if (!validMapCoordinate([a, b]) || (a === 0 && b === 0)) return null;
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
    pendingValidation: row.validation_status === "pending_validation",
    communityCandidate: !!row.community_candidate,
  };
  if (row.stop_type === "community_experience") {
    const c = row.community_experiences;
    if (!c) return null; // not approved/readable: never invent a link
    return {
      ...base,
      kind: "community",
      refId: c.id,
      title: c.title_pt,
      titleEn: c.title_en,
      slug: null,
      description: {
        pt: row.description_pt ?? c.description_pt,
        en: row.description_en ?? c.description_en,
      },
      location: row.location ?? c.location,
      isFree: true,
      coords: coordsOf(c.lat, c.lng),
      image: "",
      priceMzn: null,
      durationHours: null,
      destinationName: null,
    };
  }
  if (row.stop_type === "custom_stop") {
    if (!row.custom_title_pt) return null;
    return {
      ...base,
      kind: "custom",
      refId: row.id,
      title: row.custom_title_pt,
      titleEn: row.custom_title_en,
      slug: null,
      coords: coordsOf(row.lat, row.lng),
      image: "",
      priceMzn: null,
      durationHours: null,
      destinationName: null,
    };
  }
  if (row.destinations) {
    const d = row.destinations;
    return {
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
      isUnassigned: !!d.is_unassigned,
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
    requiresValidation: !!row.requires_validation,
    catalogNotes: { pt: row.catalog_notes_pt ?? null, en: row.catalog_notes_en ?? null },
    communityCandidates: Array.isArray(row.community_candidates)
      ? (row.community_candidates as { item?: unknown }[])
          .map((c) => (typeof c?.item === "string" ? c.item : ""))
          .filter(Boolean)
      : [],
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

/** Cover: the province photo (credited, FOTOS-1); without a province, the first destination's photo. */
export function routeCover(route: ItineraryRoute): string {
  const photo = route.province ? provincePhoto(route.province.code) : undefined;
  if (photo) return photo.src;
  if (route.province) return ""; // province without a photo: neutral placeholder, no invented image
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

export interface RouteStopInput {
  kind: RouteStopKind;
  refId: string;
  title?: string;
  titleEn?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  isFree?: boolean | null;
  notes?: string | null;
  estimatedDurationMinutes?: number | null;
  pendingValidation?: boolean;
  communityCandidate?: boolean;
}

export interface RouteDayInput {
  title?: string | null;
  titleEn?: string | null;
  description?: string | null;
  isUnassigned?: boolean;
  stops: RouteStopInput[];
}

/** Retain custom stops and metadata when importing or editing an existing plan. */
export function stopToInput(stop: RouteStop): RouteStopInput {
  return {
    kind: stop.kind,
    refId: stop.refId,
    title: stop.title,
    titleEn: stop.titleEn,
    descriptionPt: stop.description.pt,
    descriptionEn: stop.description.en,
    location: stop.location,
    lat: stop.coords?.[0] ?? null,
    lng: stop.coords?.[1] ?? null,
    isFree: stop.isFree,
    notes: stop.notes,
    estimatedDurationMinutes: stop.estimatedDurationMinutes,
    pendingValidation: stop.pendingValidation,
    communityCandidate: stop.communityCandidate,
  };
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

/** One database transaction; RLS and ownership remain authoritative. */
async function savePlan(
  routeId: string | null,
  input: RouteInput,
  curated = false,
): Promise<ItineraryRoute> {
  const { data, error } = await supabase.rpc("save_route_plan", {
    _route_id: routeId as unknown as string,
    _input: input as unknown as Json,
    _curated: curated,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Route not saved");
  const saved = await fetchRouteById(data);
  if (!saved) throw new Error("Route saved but not readable");
  return saved;
}

export async function createRoute(
  input: RouteInput,
  ownerId: string,
  options: { isCurated?: boolean } = {},
): Promise<ItineraryRoute> {
  const { data } = await supabase.auth.getUser();
  if (!data.user || (!options.isCurated && data.user.id !== ownerId))
    throw new Error("AUTH_REQUIRED");
  return savePlan(null, input, options.isCurated ?? false);
}

export async function updateRoute(routeId: string, input: RouteInput): Promise<ItineraryRoute> {
  return savePlan(routeId, input);
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
export async function decideRoute(
  routeId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  const { error } = await supabase
    .from("routes")
    .update({
      review_status: decision,
      rejection_reason: decision === "rejected" ? reason?.trim() || null : null,
    })
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
    .from("routes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("source_route_id", source.id)
    .maybeSingle();
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
        description: day.description,
        isUnassigned: day.isUnassigned,
        stops: day.stops.map(stopToInput),
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
  /** Verification state of each stop proof (verified, pending, approved, rejected). */
  proofStatus: Record<string, ProofReviewStatus>;
}

function mapProgress(row: {
  id: string;
  route_id: string;
  current_day: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  route_stop_progress:
    | { route_stop_id: string; photo_path: string | null; review_status: string }[]
    | null;
}): RouteProgress {
  return {
    id: row.id,
    routeId: row.route_id,
    currentDay: row.current_day,
    status: row.status === "completed" ? "completed" : "in_progress",
    startedAt: row.started_at,
    completedAt: row.completed_at,
    completedStopIds: (row.route_stop_progress ?? []).map((s) => s.route_stop_id),
    proofPaths: Object.fromEntries(
      (row.route_stop_progress ?? [])
        .filter((s) => s.photo_path)
        .map((s) => [s.route_stop_id, s.photo_path as string]),
    ),
    proofStatus: Object.fromEntries(
      (row.route_stop_progress ?? []).map((s) => [
        s.route_stop_id,
        s.review_status as ProofReviewStatus,
      ]),
    ),
  };
}

const PROGRESS_SELECT =
  "id, route_id, current_day, status, started_at, completed_at, route_stop_progress(route_stop_id, photo_path, review_status)";

export async function fetchRouteProgress(
  routeId: string,
  userId: string,
): Promise<RouteProgress | null> {
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
  if (error) {
    if (error.code === "23505") {
      const concurrent = await fetchRouteProgress(routeId, userId);
      if (concurrent) return concurrent;
    }
    throw new Error(error.message);
  }
  return mapProgress(data as never);
}

/** Photo proof is mandatory: upload to the user's private folder first, then pass the path. */
export async function uploadStopProof(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("invalid_type");
  if (file.size > 8 * 1024 * 1024) throw new Error("too_large");
  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(ROUTE_PROOFS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function proofUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(ROUTE_PROOFS_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export interface StopProofResult {
  review_status: ProofReviewStatus;
  location_verified: boolean | null;
  distance_m: number | null;
  accuracy_m: number | null;
}

/**
 * Completing a stop sends the photo and, when the tourist allows it, the current position to the
 * server, which checks the distance to the stop and stores only the result (never the coordinates).
 */
export async function toggleStopCompleted(
  progressId: string,
  stopId: string,
  completed: boolean,
  proof?: { photoPath: string; location: PreciseLocation | null },
): Promise<StopProofResult | null> {
  if (completed) {
    if (!proof?.photoPath) throw new Error("PHOTO_REQUIRED");
    const { data, error } = await supabase.rpc("submit_stop_proof", {
      _progress_id: progressId,
      _route_stop_id: stopId,
      _photo_path: proof.photoPath,
      _lat: proof.location?.lat,
      _lng: proof.location?.lng,
      _accuracy_m: proof.location?.accuracy,
    });
    if (error) throw new Error(error.message);
    return data as unknown as StopProofResult;
  } else {
    const { error } = await supabase
      .from("route_stop_progress")
      .delete()
      .eq("progress_id", progressId)
      .eq("route_stop_id", stopId);
    if (error) throw new Error(error.message);
  }
  return null;
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
  const { error } = await supabase.rpc("reset_my_route_progress", { _progress_id: progressId });
  if (error) throw new Error(error.message);
}

// ---------- bilingual helpers + deterministic recommendations ----------

export const ROUTE_INTERESTS = [
  "beach",
  "culture",
  "food",
  "nature",
  "community",
  "adventure",
  "wildlife",
  "history",
  "heritage",
  "local_life",
  "relax",
  "diving",
  "fishing",
  "hiking",
  "family",
  "art",
  "music",
] as const;

const ROUTE_INTEREST_META: Record<string, { emoji: string; label: { pt: string; en: string } }> = {
  beach: { emoji: "🏖️", label: { pt: "Praia", en: "Beach" } },
  culture: { emoji: "🎨", label: { pt: "Cultura", en: "Culture" } },
  food: { emoji: "🍽️", label: { pt: "Gastronomia", en: "Food" } },
  nature: { emoji: "🌿", label: { pt: "Natureza", en: "Nature" } },
  community: { emoji: "👥", label: { pt: "Comunidade", en: "Community" } },
  adventure: { emoji: "🏃", label: { pt: "Aventura", en: "Adventure" } },
  wildlife: { emoji: "🐘", label: { pt: "Vida selvagem", en: "Wildlife" } },
  history: { emoji: "📜", label: { pt: "História", en: "History" } },
  heritage: { emoji: "🏛️", label: { pt: "Património", en: "Heritage" } },
  local_life: { emoji: "🧺", label: { pt: "Vida local", en: "Local life" } },
  relax: { emoji: "🌅", label: { pt: "Relaxamento", en: "Relaxation" } },
  diving: { emoji: "🤿", label: { pt: "Mergulho", en: "Diving" } },
  fishing: { emoji: "🎣", label: { pt: "Pesca", en: "Fishing" } },
  hiking: { emoji: "🥾", label: { pt: "Hiking", en: "Hiking" } },
  family: { emoji: "👨‍👩‍👧", label: { pt: "Família", en: "Family" } },
  art: { emoji: "🖼️", label: { pt: "Arte", en: "Art" } },
  music: { emoji: "🎶", label: { pt: "Música", en: "Music" } },
};

export function routeInterestMeta(id: string) {
  return ROUTE_INTEREST_META[id] ?? { emoji: "•", label: { pt: id, en: id } };
}

export function routeTitle(r: ItineraryRoute, lang: "pt" | "en") {
  return lang === "en" && r.titleEn ? r.titleEn : r.title;
}
export function routeSubtitle(r: ItineraryRoute, lang: "pt" | "en") {
  return (lang === "en" ? r.subtitle.en : r.subtitle.pt) ?? r.subtitle.pt ?? null;
}
export function routeDescription(r: ItineraryRoute, lang: "pt" | "en") {
  return lang === "en" && r.descriptionEn ? r.descriptionEn : r.description;
}
/** Day heading: the unassigned bucket has a fixed label; other days fall back to Portuguese. */
export function dayTitle(d: RouteDay, lang: "pt" | "en"): string | null {
  if (d.isUnassigned) {
    return lang === "en" ? "Day-by-day split to be validated" : "Distribuição por dias a validar";
  }
  return (lang === "en" && d.titleEn ? d.titleEn : d.title) || null;
}
export function stopTitle(s: RouteStop, lang: "pt" | "en") {
  return lang === "en" && s.titleEn ? s.titleEn : s.title;
}

/**
 * Province first (never other provinces when the user chose some), then duration, then interests.
 * Only approved public routes come in; nothing is generated.
 */
export function recommendRoutes(
  routes: ItineraryRoute[],
  prefs: { provinces?: string[]; durationDays?: number; interests?: string[] },
  limit = 4,
): ItineraryRoute[] {
  const provs = prefs.provinces ?? [];
  const interests = prefs.interests ?? [];
  if (!provs.length && !prefs.durationDays && !interests.length) return [];
  return routes
    .filter((r) => r.isPublic && r.status === "active" && r.reviewStatus === "approved")
    .filter((r) => !provs.length || (r.province && provs.includes(r.province.code)))
    .map((r) => {
      let score = provs.length ? 5 : 0;
      if (prefs.durationDays) {
        const diff = Math.abs(r.durationDays - prefs.durationDays);
        score += diff === 0 ? 3 : diff === 1 ? 2 : 0;
      }
      score += r.interests.filter((i) => interests.includes(i)).length * 2;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}

// ---------- personalised discovery (8D.3) ----------

/**
 * Profile interests (onboarding vocabulary) → route interest ids stored in routes.interests.
 * Explicit map so matching never depends on language, accents or casing.
 */
const PREF_TO_ROUTE_INTERESTS: Record<string, string[]> = {
  beach: ["beach", "relax", "diving"],
  culture: ["culture", "heritage", "history", "art", "music"],
  food: ["food"],
  nature: ["nature", "wildlife", "hiking"],
  community: ["community", "local_life"],
  heritage: ["heritage", "history", "culture"],
  festival: ["music", "culture"],
  adventure: ["adventure", "hiking", "diving"],
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/** Number of the user's interests matched by the route (partial match). */
export function routeInterestMatches(route: ItineraryRoute, interests: string[]): string[] {
  const have = new Set(route.interests.map(norm));
  return interests.filter((i) =>
    (PREF_TO_ROUTE_INTERESTS[norm(i)] ?? [norm(i)]).some((x) => have.has(x)),
  );
}

export interface PersonalizedRoutes {
  /** Chosen province(s) + interest match + exact duration. */
  exact: ItineraryRoute[];
  /** Chosen province(s) + interest match, other duration (labelled as alternative). */
  otherDuration: ItineraryRoute[];
  /** Chosen province(s), no interest overlap. */
  otherInProvince: ItineraryRoute[];
  /** Other provinces, never mixed with the above. */
  otherRegions: ItineraryRoute[];
}

/** Splits publicly visible routes by the saved preferences. Never hides an eligible route. */
export function personalizeRoutes(
  routes: ItineraryRoute[],
  prefs: { provinces: string[]; durationDays?: number; interests: string[] },
): PersonalizedRoutes {
  const visible = routes.filter(
    (r) => r.isPublic && r.status === "active" && r.reviewStatus === "approved",
  );
  const days = prefs.durationDays;
  const score = (r: ItineraryRoute) => routeInterestMatches(r, prefs.interests).length;
  const diff = (r: ItineraryRoute) => (days ? Math.abs(r.durationDays - days) : 0);
  const byFit = (a: ItineraryRoute, b: ItineraryRoute) =>
    score(b) - score(a) || diff(a) - diff(b) || a.title.localeCompare(b.title);
  const inProv = visible.filter((r) => r.province && prefs.provinces.includes(r.province.code));
  const matching = inProv.filter((r) => !prefs.interests.length || score(r) > 0);
  const res: PersonalizedRoutes = {
    exact: matching.filter((r) => !days || r.durationDays === days).sort(byFit),
    otherDuration: matching
      .filter((r) => !!days && r.durationDays !== days)
      .sort((a, b) => diff(a) - diff(b) || byFit(a, b)),
    otherInProvince: inProv.filter((r) => !matching.includes(r)).sort(byFit),
    otherRegions: visible
      .filter((r) => !inProv.includes(r) && (!prefs.interests.length || score(r) > 0))
      .sort(byFit),
  };
  return res;
}

/** Admin decision on a pending stop proof; approving awards the stop points once (server trigger). */
export async function reviewStopProof(
  progressId: string,
  stopId: string,
  approve: boolean,
): Promise<ProofReviewStatus> {
  const { data, error } = await supabase.rpc("review_stop_proof", {
    _progress_id: progressId,
    _route_stop_id: stopId,
    _approve: approve,
  });
  if (error) throw new Error(error.message);
  return data as ProofReviewStatus;
}
