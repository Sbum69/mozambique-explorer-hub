import type { Destination } from "@/lib/destinations";
import type { Experience } from "@/lib/experiences";

/** Preferences collected during onboarding and stored in profiles. */
export interface TravelPreferences {
  /** Destination slug chosen in onboarding (profiles.province). */
  province?: string;
  /** Province codes chosen by the tourist (profile_provinces → provinces.code). */
  provinces?: string[];
  durationDays?: number;
  interests?: string[];
}

/**
 * Interests use a slightly wider vocabulary than the catalogue categories.
 * This map keeps the relation explicit instead of guessing at runtime.
 */
const INTEREST_TO_CATEGORIES: Record<string, string[]> = {
  beach: ["beach"],
  culture: ["culture", "heritage"],
  food: ["food"],
  nature: ["nature"],
  community: ["community"],
  heritage: ["heritage", "culture"],
  festival: ["culture"],
  adventure: ["adventure"],
};

function categoriesFor(interests: string[]): string[] {
  return [...new Set(interests.flatMap((id) => INTEREST_TO_CATEGORIES[id] ?? [id]))];
}

export function hasPreferences(prefs: TravelPreferences | undefined): boolean {
  return !!prefs?.province || (prefs?.provinces?.length ?? 0) > 0;
}

/** Province codes the tourist cares about (several provinces are allowed). */
function preferredProvinceCodes(prefs: TravelPreferences, preferred?: Destination | null): string[] {
  const codes = [...(prefs.provinces ?? [])];
  if (preferred?.province) codes.push(preferred.province);
  return [...new Set(codes)];
}

export interface Scored<T> {
  item: T;
  score: number;
  /** Interest ids that actually matched — used for the "why it matches you" hint. */
  reasons: string[];
  /** True when the item sits in the preferred destination/province. */
  matchesProvince: boolean;
}

interface ScoreContext {
  /** destinationUuid/slug → number of active availability windows. */
  availabilityByExperience?: Record<string, number>;
  /** Destination slug of the preferred province, resolved from the catalogue. */
  preferredDestination?: Destination | null;
}

/**
 * Deterministic and intentionally simple scoring:
 *  +4  destination/province matches the preference
 *  +3  per matching interest category
 *  +2  the experience has at least one availability window in the database
 *  +1  the experience is linked to a real destination
 */
export function scoreExperience(
  experience: Experience,
  prefs: TravelPreferences,
  ctx: ScoreContext = {},
): Scored<Experience> {
  const interests = prefs.interests ?? [];
  const categories = categoriesFor(interests);
  const preferred = ctx.preferredDestination;

  const matchesProvince =
    !!preferred &&
    (experience.destinationId === preferred.slug ||
      experience.destinationUuid === preferred.id ||
      experience.province === preferred.province);

  const reasons = interests.filter((id) =>
    (INTEREST_TO_CATEGORIES[id] ?? [id]).includes(experience.category),
  );

  let score = 0;
  if (matchesProvince) score += 4;
  score += reasons.length * 3;
  if (categories.includes(experience.category) && reasons.length === 0) score += 1;
  if ((ctx.availabilityByExperience?.[experience.id] ?? 0) > 0) score += 2;
  if (experience.destinationUuid) score += 1;

  return { item: experience, score, reasons, matchesProvince };
}

/**
 * Destinations score on province match and on the interest that matches their category.
 */
export function scoreDestination(
  destination: Destination,
  prefs: TravelPreferences,
  experiences: Experience[] = [],
): Scored<Destination> {
  const interests = prefs.interests ?? [];
  const matchesProvince = prefs.province === destination.slug;

  const reasons = interests.filter((id) =>
    (INTEREST_TO_CATEGORIES[id] ?? [id]).includes(destination.category ?? ""),
  );

  const linkedExperiences = experiences.filter(
    (e) => e.destinationUuid === destination.id || e.destinationId === destination.slug,
  );
  const interestCategories = categoriesFor(interests);
  const matchingExperiences = linkedExperiences.filter((e) =>
    interestCategories.includes(e.category),
  );

  let score = 0;
  if (matchesProvince) score += 4;
  score += reasons.length * 3;
  score += Math.min(matchingExperiences.length, 3) * 2;
  if (linkedExperiences.length > 0) score += 1;

  return { item: destination, score, reasons, matchesProvince };
}

export function recommendExperiences(
  experiences: Experience[],
  prefs: TravelPreferences,
  ctx: ScoreContext = {},
  limit = 6,
): Scored<Experience>[] {
  return experiences
    .map((experience) => scoreExperience(experience, prefs, ctx))
    .sort((a, b) => b.score - a.score || b.item.rating - a.item.rating)
    .slice(0, limit);
}

export function recommendDestinations(
  destinations: Destination[],
  prefs: TravelPreferences,
  experiences: Experience[] = [],
  limit = 3,
): Scored<Destination>[] {
  return destinations
    .map((destination) => scoreDestination(destination, prefs, experiences))
    .sort((a, b) => b.score - a.score || b.item.visitorsK - a.item.visitorsK)
    .slice(0, limit);
}
