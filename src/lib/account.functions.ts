import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readAll } from "./read-all";

const PAGE = 499;

/**
 * "Export my data": everything the signed-in user owns, read with their own session (RLS applies,
 * so nothing of other people can come out). Returned as plain JSON for a file download.
 */
export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const uid = context.userId;
    const must = <T>(name: string, r: { data: T; error: { message: string } | null }): T => {
      if (r.error) throw new Error(`EXPORT_FAILED:${name}`);
      return r.data;
    };

    const [profile, roles, provinces] = await Promise.all([
      sb.from("profiles").select("*").eq("id", uid).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", uid),
      sb
        .from("profile_provinces")
        .select("provinces(code, name_pt, name_en)")
        .eq("profile_id", uid),
    ]);
    const lists = await Promise.all([
      readAll((o) =>
        sb
          .from("bookings")
          .select("*")
          .eq("customer_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
      readAll((o) =>
        sb
          .from("favorites")
          .select("*")
          .eq("user_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
      readAll((o) =>
        sb
          .from("points_ledger")
          .select("*")
          .eq("user_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
      readAll((o) =>
        sb
          .from("community_posts")
          .select("*")
          .eq("author_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
      readAll((o) =>
        sb
          .from("community_post_reactions")
          .select("*")
          .eq("user_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
      readAll((o) =>
        sb
          .from("routes")
          .select("*")
          .eq("owner_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
      readAll((o) =>
        sb
          .from("reward_redemptions")
          .select("*")
          .eq("user_id", uid)
          .order("created_at")
          .range(o, o + PAGE),
      ),
    ]);
    const names = [
      "bookings",
      "favorites",
      "points",
      "community_posts",
      "community_reactions",
      "itineraries",
      "reward_redemptions",
    ] as const;

    return {
      exported_at: new Date().toISOString(),
      account: { id: uid, email: (context.claims as { email?: string }).email ?? null },
      profile: must("profile", profile),
      roles: must("roles", roles)?.map((r) => r.role) ?? [],
      preferred_provinces: must("provinces", provinces) ?? [],
      ...Object.fromEntries(
        lists.map((r, i) => {
          if (r.error) throw new Error(`EXPORT_FAILED:${names[i]}`);
          return [names[i], r.data as unknown[]];
        }),
      ),
    };
  });
