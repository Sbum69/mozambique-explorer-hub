import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BOOKING_SELECT, mapBooking, type BookingRow } from "./bookings";
import { readAll } from "./read-all";

export const getOwnerBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (
      roleError ||
      !roles?.some((r) => r.role === "business_small" || r.role === "business_large")
    )
      throw new Error("Forbidden");
    const { data: businesses, error } = await readAll((offset) =>
      context.supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", context.userId)
        .order("id")
        .range(offset, offset + 499),
    );
    if (error) throw new Error("Could not load businesses");
    const ids = (businesses ?? []).map((b) => b.id);
    if (!ids.length) return [];
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const result = await context.supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .in("business_id", ids)
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (result.error) throw new Error("Could not load bookings");
      rows.push(...(result.data ?? []).map((r) => mapBooking(r as unknown as BookingRow)));
      if ((result.data?.length ?? 0) < 500) break;
    }
    return rows;
  });

export const getAdminSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !admin) throw new Error("Forbidden");
    // Counts leave out internal (test) and deleted accounts and everything they own (DADOS-2).
    const [counts, recent] = await Promise.all([
      context.supabase.rpc("admin_platform_summary"),
      context.supabase
        .from("businesses")
        .select("id,name,status,created_at")
        .order("created_at", { ascending: false })
        .order("id")
        .limit(5),
    ]);
    if (counts.error || recent.error) throw new Error("Could not load summary");
    const c = (counts.data ?? {}) as Record<string, number>;
    return {
      profiles: c.profiles ?? 0,
      internalProfiles: c.internal_profiles ?? 0,
      businesses: c.businesses ?? 0,
      activities: c.activities ?? 0,
      bookings: c.bookings ?? 0,
      pending: c.pending ?? 0,
      recent: recent.data ?? [],
    };
  });
