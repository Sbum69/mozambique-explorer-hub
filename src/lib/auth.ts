import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "tourist" | "business_small" | "business_large" | "admin";

/** Internal pages login/signup may return to. A whitelist, so `?redirect=` can never point elsewhere. */
// Fixed allowlist (no open redirects): pages a guest can return to after signing in.
export const AUTH_RETURN_PATHS = [
  "/business-register",
  "/map",
  "/experiences",
  "/itineraries",
  "/favorites",
] as const;
export type AuthReturnPath = (typeof AUTH_RETURN_PATHS)[number];

export function parseAuthReturn(value: unknown): AuthReturnPath | undefined {
  return AUTH_RETURN_PATHS.find((path) => path === value);
}

/** Page saved at sign-up (user_metadata.return_to), only if it is still on the allowlist. */
export function postConfirmTarget(
  metadata: Record<string, unknown> | null | undefined,
): AuthReturnPath | undefined {
  return parseAuthReturn(metadata?.return_to);
}

/** Allowed return target for the current page; a route detail returns to its list. */
export function authReturnFor(pathname: string): AuthReturnPath | undefined {
  if (pathname.startsWith("/itinerary/")) return "/itineraries";
  if (pathname.startsWith("/experience/")) return "/experiences";
  return parseAuthReturn(pathname);
}

/** Search schema shared by /login and /signup. */
export function validateAuthReturnSearch(search: Record<string, unknown>): {
  redirect?: AuthReturnPath;
} {
  const target = parseAuthReturn(search.redirect);
  return target ? { redirect: target } : {};
}

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
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

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
  if (roles.includes("business_small") || roles.includes("business_large"))
    return "/business-dashboard";
  return postAuthTarget(userId);
}
