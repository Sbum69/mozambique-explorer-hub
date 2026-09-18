import type { Destination } from "@/lib/destinations";
import type { Experience } from "@/lib/experiences";
import { recommendExperiences, type TravelPreferences } from "@/lib/recommendations";

/**
 * Structured itinerary model.
 *
 * Every stop points at a real Ekaya entity that exists in the database
 * (a destination row or an experience row). There is no free-text place type on
 * purpose: a future planner must pick from real options, never invent places.
 */
export type ItineraryStopKind = "destination" | "experience";

export interface ItineraryStop {
  kind: ItineraryStopKind;
  /** Real database identifier (destinations.id or experiences.id). */
  refId: string;
  /** Stable slug of the referenced row, when it has one. */
  slug: string | null;
  title: string;
  /** Start time taken from experience_availability, when the stop has one. */
  startTime?: string;
  durationHours?: number;
  priceMzn?: number;
}

export interface ItineraryDay {
  day: number;
  destinationId: string | null;
  stops: ItineraryStop[];
}

export interface StructuredItinerary {
  preferences: TravelPreferences;
  days: ItineraryDay[];
}

export function experienceToStop(experience: Experience): ItineraryStop {
  return {
    kind: "experience",
    refId: experience.id,
    slug: experience.slug,
    title: experience.title.pt,
    durationHours: experience.durationHours,
    priceMzn: experience.priceMzn,
  };
}

export function destinationToStop(destination: Destination): ItineraryStop {
  return {
    kind: "destination",
    refId: destination.id,
    slug: destination.slug,
    title: destination.name,
  };
}

/**
 * The option set a future itinerary planner (AI or otherwise) is allowed to choose from:
 * only real destinations and real experiences, already ranked by the user's preferences.
 */
export interface ItineraryOptionSet {
  preferences: TravelPreferences;
  destinations: Destination[];
  experiences: Experience[];
  stops: ItineraryStop[];
}

export function buildItineraryOptionSet(
  destinations: Destination[],
  experiences: Experience[],
  prefs: TravelPreferences,
): ItineraryOptionSet {
  const ranked = recommendExperiences(experiences, prefs, {}, experiences.length).map(
    (entry) => entry.item,
  );
  return {
    preferences: prefs,
    destinations,
    experiences: ranked,
    stops: [...destinations.map(destinationToStop), ...ranked.map(experienceToStop)],
  };
}

/**
 * Minimal deterministic draft: spreads the ranked real experiences over the
 * requested number of days. No invented content; if there are not enough real
 * experiences, the remaining days simply stay empty.
 */
export function draftItinerary(
  destinations: Destination[],
  experiences: Experience[],
  prefs: TravelPreferences,
  stopsPerDay = 2,
): StructuredItinerary {
  const options = buildItineraryOptionSet(destinations, experiences, prefs);
  const days = Math.max(1, Math.min(prefs.durationDays ?? 3, 7));
  const pool = options.experiences;

  return {
    preferences: prefs,
    days: Array.from({ length: days }).map((_, index) => {
      const slice = pool.slice(index * stopsPerDay, index * stopsPerDay + stopsPerDay);
      return {
        day: index + 1,
        destinationId: slice[0]?.destinationUuid ?? null,
        stops: slice.map(experienceToStop),
      };
    }),
  };
}
