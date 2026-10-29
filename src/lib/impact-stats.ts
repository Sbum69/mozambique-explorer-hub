import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "no_show";

export interface ImpactStats {
  generated_at: string;
  platform: {
    destinations: number;
    active_activities: number;
    approved_businesses: number;
    community_experiences: number;
    public_routes: number;
    accounts: number;
    bookings_total: number;
    /** no_show is only returned once migration 0037 is applied. */
    bookings_by_status: Record<Exclude<BookingStatus, "no_show">, number> & { no_show?: number };
    activities_by_province: Record<string, number>;
  };
  verified: {
    completed_bookings: number;
    completed_people: number;
    businesses_with_completed: number;
    completed_routes: number;
    stops_with_proof: number;
    completed_by_province: Record<string, number>;
  };
}

/** Minimum group size before a per-province verified count is shown (privacy). */
export const MIN_GROUP = 3;

/** Single source: the aggregate-only database function. Never hardcode figures. */
export async function fetchImpactStats(): Promise<ImpactStats> {
  const { data, error } = await supabase.rpc("platform_impact_stats");
  if (error) throw new Error(error.message);
  return data as unknown as ImpactStats;
}

export const impactStatsQuery = () =>
  queryOptions({ queryKey: ["impact-stats"], queryFn: fetchImpactStats, staleTime: 60_000 });

/** Mirrors the DB rule: only completed bookings whose start (Mozambique time) has passed are realised tourism. */
export function isRealisedBooking(
  b: { status: BookingStatus; date: string; time: string },
  now = new Date(),
): boolean {
  if (b.status !== "completed") return false;
  const start = Date.parse(`${b.date}T${b.time.slice(0, 5)}:00+02:00`);
  return start <= now.getTime();
}

export interface ImpactView {
  hasVerifiedImpact: boolean;
  provinceRows: { name: string; count: number; pct: number }[];
  verifiedProvinceRows: { name: string; count: number }[];
  /** No payment records exist, so no money metric is ever produced. */
  revenue: null;
}

export function deriveImpactView(s: ImpactStats): ImpactView {
  const v = s.verified;
  const total = Object.values(s.platform.activities_by_province).reduce((a, n) => a + n, 0);
  return {
    hasVerifiedImpact: v.completed_bookings + v.completed_routes + v.stops_with_proof > 0,
    provinceRows: Object.entries(s.platform.activities_by_province)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      })),
    verifiedProvinceRows: Object.entries(v.completed_by_province)
      .filter(([, n]) => n >= MIN_GROUP)
      .map(([name, count]) => ({ name, count })),
    revenue: null,
  };
}
