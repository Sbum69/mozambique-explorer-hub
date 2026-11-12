import type { TravelPreferences } from "@/lib/recommendations";

/**
 * What a visitor picked on the Home selector before having an account (destination, days,
 * interests). Kept only for this browser tab (sessionStorage), as UI state: after sign-up the
 * onboarding starts from it and the real preferences are then saved on the profile (Supabase).
 */
const KEY = "ekaya.visitor-choice";

export function saveVisitorChoice(choice: TravelPreferences): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    // private mode or blocked storage: the choice simply is not carried over
  }
}

export function readVisitorChoice(): TravelPreferences | undefined {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as Partial<TravelPreferences>;
    const choice: TravelPreferences = {
      province: typeof v.province === "string" ? v.province : undefined,
      durationDays: typeof v.durationDays === "number" ? v.durationDays : undefined,
      interests: Array.isArray(v.interests)
        ? v.interests.filter((i): i is string => typeof i === "string")
        : [],
    };
    return choice;
  } catch {
    return undefined;
  }
}

export function clearVisitorChoice(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
