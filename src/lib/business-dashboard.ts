import type { BookingStatus } from "./bookings";
export const bookingStates: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "rejected",
  "cancelled",
];
export function bookingHasStarted(date: string, time: string, now = Date.now()) {
  return new Date(`${date}T${time.slice(0, 5)}:00+02:00`).getTime() <= now;
}
export function bookingMetrics(
  rows: { status: BookingStatus; date: string; time: string }[],
  now = Date.now(),
) {
  const counts = {
    all: rows.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    no_show: 0,
    rejected: 0,
    cancelled: 0,
    upcoming: 0,
  };
  for (const row of rows) {
    counts[row.status]++;
    if (row.status === "confirmed" && !bookingHasStarted(row.date, row.time, now))
      counts.upcoming++;
  }
  return counts;
}
export function activityMetrics(
  activities: { id: string; active: boolean; business_id: string }[],
  slots: { experience_id: string; active: boolean; accepts_new_bookings: boolean }[],
  businesses: { id: string; status: string }[],
) {
  const available = new Set(
    activities
      .filter(
        (a) =>
          a.active && businesses.some((b) => b.id === a.business_id && b.status === "approved"),
      )
      .map((a) => a.id),
  );
  return {
    total: activities.length,
    active: activities.filter((a) => a.active).length,
    inactive: activities.filter((a) => !a.active).length,
    open: slots.filter((s) => s.active && s.accepts_new_bookings && available.has(s.experience_id))
      .length,
    closed: slots.filter((s) => !s.accepts_new_bookings).length,
    unavailable: slots.filter(
      (s) => s.accepts_new_bookings && (!s.active || !available.has(s.experience_id)),
    ).length,
  };
}
