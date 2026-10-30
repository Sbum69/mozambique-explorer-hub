import { useMemo } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useDestinations } from "@/hooks/useDestinations";

/**
 * Single read path for the saved travel preferences (profile + profile_provinces via AuthContext).
 * Province codes come from profile_provinces; older profiles fall back to the onboarding destination's province.
 */
export function usePersonalPrefs() {
  const { user, isAuthenticated } = useAuth();
  const prefs = user?.preferences;
  // The catalogue is only needed for older profiles that saved a destination but no province.
  const needsDestinations = !prefs?.provinces?.length && !!prefs?.province;
  const { destinations } = useDestinations(undefined, { enabled: needsDestinations });
  return useMemo(() => {
    let provinces = prefs?.provinces ?? [];
    if (!provinces.length && prefs?.province) {
      const d = destinations.find((x) => x.slug === prefs.province);
      if (d?.province) provinces = [d.province];
    }
    const interests = prefs?.interests ?? [];
    const durationDays = prefs?.durationDays;
    return {
      isAuthenticated,
      hasPrefs: isAuthenticated && provinces.length > 0,
      provinces,
      interests,
      durationDays,
    };
  }, [
    isAuthenticated,
    prefs?.provinces,
    prefs?.province,
    prefs?.interests,
    prefs?.durationDays,
    destinations,
  ]);
}
