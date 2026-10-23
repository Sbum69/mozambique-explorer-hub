import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "tourist" | "business_small" | "business_large" | "admin";

export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw redirect({ to: "/login" });
  return user;
}

export async function getAuthenticatedRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) return [];
  return data.map(({ role }) => role);
}

/** Onboarding is considered complete once the profile has a chosen province. */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("province")
    .eq("id", userId)
    .maybeSingle();

  if (error) return true; // never block the user because of a read failure
  return !!data?.province;
}

export async function requireRole(allowed: AppRole[]) {
  const user = await requireAuthenticatedUser();
  const roles = await getAuthenticatedRoles(user.id);
  if (!roles.some((role) => allowed.includes(role))) {
    throw redirect({ to: "/dashboard" });
  }
  return { user, roles };
}

/** Where an authenticated user should land: onboarding first, then the app. */
export async function postAuthTarget(userId: string): Promise<"/onboarding" | "/home"> {
  return (await hasCompletedOnboarding(userId)) ? "/home" : "/onboarding";
}

/** Role-aware landing page, based only on server-side user_roles rows. */
export async function roleLandingTarget(
  userId: string,
): Promise<"/admin" | "/business-dashboard" | "/onboarding" | "/home"> {
  const roles = await getAuthenticatedRoles(userId);
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("business_small") || roles.includes("business_large")) return "/business-dashboard";
  return postAuthTarget(userId);
}
