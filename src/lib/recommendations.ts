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
  // Itineraries use a wider vocabulary (history, wildlife, diving…): mapped here, never guessed.
  beach: ["beach", "diving", "relax"],
  culture: ["culture", "heritage", "history", "art", "music"],
  food: ["food"],
  nature: ["nature", "wildlife", "hiking"],
  community: ["community", "local_life"],
  heritage: ["heritage", "culture", "history"],
  festival: ["culture"],
  adventure: ["adventure"],
};

/** Which of the user's interests a community category satisfies (explicit map, no guessing). */
export function communityInterestMatches(category: string, interests: string[]): string[] {
  return interests.filter((id) => (INTEREST_TO_CATEGORIES[id] ?? [id]).includes(category));
}

function categoriesFor(interests: string[]): string[] {
  return [...new Set(interests.flatMap((id) => INTEREST_TO_CATEGORIES[id] ?? [id]))];
}

/**
 * Something real to personalise with: a destination or provinces, interests or a trip length.
 * Without any of them the UI shows a general "Discover" list and never says "for you".
 */
export function hasPreferences(prefs: TravelPreferences | undefined): boolean {
  return (
    !!prefs?.province ||
    (prefs?.provinces?.length ?? 0) > 0 ||
    (prefs?.interests?.length ?? 0) > 0 ||
    !!prefs?.durationDays
  );
}

/** Province codes the tourist cares about (several provinces are allowed). */
function preferredProvinceCodes(
  prefs: TravelPreferences,
  preferred?: Destination | null,
): string[] {
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

  const provinceCodes = preferredProvinceCodes(prefs, preferred);
  const matchesProvince =
    (!!preferred &&
      (experience.destinationId === preferred.slug ||
        experience.destinationUuid === preferred.id ||
        experience.province === preferred.province)) ||
    (!!experience.province && provinceCodes.includes(experience.province));

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
  const matchesProvince =
    prefs.province === destination.slug ||
    (!!destination.province && (prefs.provinces ?? []).includes(destination.province));

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
    .sort((a, b) => b.score - a.score || a.item.title.pt.localeCompare(b.item.title.pt))
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
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

/**
 * Community (free) experiences reuse the same rules:
 *  1) only the provinces the tourist chose (all provinces only when none / "Todas" is chosen);
 *  2) then interests (+3 per matching interest).
 */
export function recommendCommunity<T extends { provinceCode: string; category: string }>(
  items: T[],
  prefs: TravelPreferences,
  allProvinceCodes: string[] = [],
  limit = 4,
): Scored<T>[] {
  const chosen = prefs.provinces ?? [];
  const isAll =
    chosen.length === 0 ||
    (allProvinceCodes.length > 0 && allProvinceCodes.every((c) => chosen.includes(c)));
  const interests = prefs.interests ?? [];
  return items
    .filter((it) => isAll || chosen.includes(it.provinceCode))
    .map((item) => {
      const reasons = interests.filter((id) =>
        (INTEREST_TO_CATEGORIES[id] ?? [id]).includes(item.category),
      );
      const matchesProvince = !isAll;
      return {
        item,
        reasons,
        matchesProvince,
        score: (matchesProvince ? 4 : 0) + reasons.length * 3,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** The parts of an itinerary the recommendation needs (ItineraryRoute has them all). */
interface RouteLike {
  durationDays: number;
  interests: string[];
  province: { code: string } | null;
  isCurated: boolean;
}

/**
 * Itineraries use the same rules as everything else: never longer than the trip (one day of
 * tolerance), +4 when the province matches, +3 per shared interest; curated ones win ties.
 */
export function recommendRoutes<T extends RouteLike>(
  routes: T[],
  prefs: TravelPreferences,
  preferred?: Destination | null,
  limit = 4,
): Scored<T>[] {
  const provinceCodes = preferredProvinceCodes(prefs, preferred);
  const interests = prefs.interests ?? [];
  const maxDays = prefs.durationDays;
  return routes
    .filter((route) => !maxDays || route.durationDays <= maxDays + 1)
    .map((item) => {
      const matchesProvince = !!item.province && provinceCodes.includes(item.province.code);
      const reasons = interests.filter((id) =>
        item.interests.some(
          (routeInterest) =>
            routeInterest === id || (INTEREST_TO_CATEGORIES[id] ?? []).includes(routeInterest),
        ),
      );
      return {
        item,
        reasons,
        matchesProvince,
        score: (matchesProvince ? 4 : 0) + reasons.length * 3,
      };
    })
    .sort((a, b) => b.score - a.score || Number(b.item.isCurated) - Number(a.item.isCurated))
    .slice(0, limit);
}
