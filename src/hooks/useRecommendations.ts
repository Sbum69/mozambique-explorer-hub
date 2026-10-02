import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useDestinations } from "@/hooks/useDestinations";
import { useExperiences } from "@/hooks/useExperiences";
import { fetchAvailabilityCounts } from "@/lib/experiences";
import { fetchCommunityExperiences, type CommunityExperience } from "@/lib/community-experiences";
import { useProvinces } from "@/hooks/useProvinces";
import {
  hasPreferences,
  recommendCommunity,
  recommendDestinations,
  recommendExperiences,
  type TravelPreferences,
} from "@/lib/recommendations";

let communityCache: CommunityExperience[] | null = null;
let availabilityCache: Record<string, number> | null = null;

/**
 * Personalised recommendations built from the real catalogue plus the preferences
 * stored on the user's profile. Reuses the shared destination/experience hooks,
 * so no extra catalogue queries are made.
 */
export function useRecommendations(limit = 6) {
  const { user } = useAuth();
  const { destinations, loading: loadingDestinations, error: destinationsError } = useDestinations();
  const { experiences, loading: loadingExperiences, error: experiencesError } = useExperiences();
  const [availability, setAvailability] = useState<Record<string, number>>(availabilityCache ?? {});

  useEffect(() => {
    if (availabilityCache) return;
    let active = true;
    fetchAvailabilityCounts()
      .then((counts) => {
        availabilityCache = counts;
        if (active) setAvailability(counts);
      })
      .catch(() => {
        // availability only adds a bonus to the score; failing is not fatal
      });
    return () => {
      active = false;
    };
  }, []);

  const { provinces } = useProvinces();
  const [community, setCommunity] = useState<CommunityExperience[]>(communityCache ?? []);
  useEffect(() => {
    if (communityCache) return;
    let active = true;
    fetchCommunityExperiences()
      .then((rows) => {
        communityCache = rows;
        if (active) setCommunity(rows);
      })
      .catch(() => {
        // community recommendations are optional
      });
    return () => {
      active = false;
    };
  }, []);

  const preferences: TravelPreferences = useMemo(
    () => ({
      province: user?.preferences?.province,
      provinces: user?.preferences?.provinces ?? [],
      durationDays: user?.preferences?.durationDays,
      interests: user?.preferences?.interests ?? [],
    }),
    [
      user?.preferences?.province,
      user?.preferences?.provinces,
      user?.preferences?.durationDays,
      user?.preferences?.interests,
    ],
  );

  const personalised = hasPreferences(preferences);

  const preferredDestination = useMemo(
    () => destinations.find((d) => d.slug === preferences.province) ?? null,
    [destinations, preferences.province],
  );

  const recommendedExperiences = useMemo(
    () =>
      personalised
        ? recommendExperiences(
            experiences,
            preferences,
            { availabilityByExperience: availability, preferredDestination },
            limit,
          )
        : [],
    [personalised, experiences, preferences, availability, preferredDestination, limit],
  );

  const recommendedDestinations = useMemo(
    () => (personalised ? recommendDestinations(destinations, preferences, experiences, 3) : []),
    [personalised, destinations, preferences, experiences],
  );

  const recommendedCommunity = useMemo(
    () => (personalised ? recommendCommunity(community, preferences, provinces.map((p) => p.code), 4) : []),
    [personalised, community, preferences, provinces],
  );

  return {
    personalised,
    recommendedCommunity,
    preferences,
    preferredDestination,
    recommendedExperiences,
    recommendedDestinations,
    destinations,
    experiences,
    loading: loadingDestinations || loadingExperiences,
    error: destinationsError ?? experiencesError,
  };
}
