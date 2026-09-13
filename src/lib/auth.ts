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

export async function requireRole(allowed: AppRole[]) {
  const user = await requireAuthenticatedUser();
  const roles = await getAuthenticatedRoles(user.id);
  if (!roles.some((role) => allowed.includes(role))) {
    throw redirect({ to: "/dashboard" });
  }
  return { user, roles };
}
