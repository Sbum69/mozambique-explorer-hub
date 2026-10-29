import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlatformRole = "tourist" | "business_small" | "business_large" | "admin";

export interface PlatformUser {
  id: string;
  displayName: string;
  email: string;
  roles: PlatformRole[];
  primaryRole: PlatformRole;
  createdAt: string;
  confirmed: boolean;
  /** Test or staff account: left out of every metric (DADOS-2). */
  internal: boolean;
  /** Deleted by its owner and anonymised (kept only for records others rely on). */
  deleted: boolean;
  businessName?: string;
  businessStatus?: string;
  businessVerified?: boolean;
}

const ROLE_PRIORITY: PlatformRole[] = ["admin", "business_large", "business_small", "tourist"];

/**
 * Admin-only listing of the real platform users.
 * The caller's own (RLS-bound) client proves the admin role before the
 * privileged client is loaded, so a tourist token can never read this.
 */
export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformUser[]> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error: profilesError }, { data: roleRows }, { data: businesses }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, display_name, created_at, is_internal, deleted_at")
          .order("created_at"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin
          .from("businesses")
          .select("owner_id, name, status, verified")
          .not("owner_id", "is", null),
      ]);
    if (profilesError) throw new Error("Não foi possível ler os utilizadores.");

    // Emails and confirmation state only exist in the auth schema.
    const emails = new Map<string, { email: string; confirmed: boolean }>();
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      for (const u of data.users) {
        emails.set(u.id, { email: u.email ?? "—", confirmed: !!u.email_confirmed_at });
      }
      if (data.users.length < 200) break;
      page += 1;
    }

    return (profiles ?? []).map((profile) => {
      const roles = (roleRows ?? [])
        .filter((r) => r.user_id === profile.id)
        .map((r) => r.role as PlatformRole);
      const business = (businesses ?? []).find((b) => b.owner_id === profile.id);
      const auth = emails.get(profile.id);
      return {
        id: profile.id,
        displayName: profile.display_name ?? "Sem nome",
        email: auth?.email ?? "—",
        confirmed: auth?.confirmed ?? false,
        internal: profile.is_internal,
        deleted: !!profile.deleted_at,
        roles,
        primaryRole: ROLE_PRIORITY.find((candidate) => roles.includes(candidate)) ?? "tourist",
        createdAt: profile.created_at,
        ...(business
          ? {
              businessName: business.name,
              businessStatus: business.status as string,
              businessVerified: business.verified,
            }
          : {}),
      };
    });
  });
