import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BY_SLUG } from "@/lib/destinations";

export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

export interface Booking {
  id: string;
  code: string;
  experienceId: string;
  businessId: string;
  experienceTitle: { pt: string; en: string };
  host: string;
  location: string;
  destinationName: string | null;
  image: string;
  durationHours: number;
  date: string;
  /** HH:MM */
  time: string;
  people: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
  totalMzn: number;
  status: BookingStatus;
  createdAt: string;
}

const SELECT =
  "id, code, experience_id, business_id, date, time, people, customer_name, customer_phone, customer_email, notes, total_mzn, status, created_at, experiences(title_pt, title_en, images, duration_hours, location, province, businesses(name), destinations(name, slug))";

interface JoinedExperience {
  title_pt: string;
  title_en: string | null;
  images: string[] | null;
  duration_hours: number | string | null;
  location: string | null;
  province: string | null;
  businesses: { name: string } | { name: string }[] | null;
  destinations: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

interface BookingRow {
  id: string;
  code: string;
  experience_id: string;
  business_id: string;
  date: string;
  time: string;
  people: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  total_mzn: number | string;
  status: BookingStatus;
  created_at: string;
  experiences: JoinedExperience | JoinedExperience[] | null;
}

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapBooking(row: BookingRow): Booking {
  const exp = first(row.experiences);
  const destination = exp ? first(exp.destinations) : null;
  const business = exp ? first(exp.businesses) : null;
  const titlePt = exp?.title_pt ?? "";
  return {
    id: row.id,
    code: row.code,
    experienceId: row.experience_id,
    businessId: row.business_id,
    experienceTitle: { pt: titlePt, en: exp?.title_en ?? titlePt },
    host: business?.name ?? "",
    location: exp?.location ?? destination?.name ?? exp?.province ?? "",
    destinationName: destination?.name ?? null,
    image: (destination ? IMAGE_BY_SLUG[destination.slug] : undefined) ?? exp?.images?.[0] ?? "",
    durationHours: Number(exp?.duration_hours ?? 0),
    date: row.date,
    time: String(row.time).slice(0, 5),
    people: row.people,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    notes: row.notes,
    totalMzn: Number(row.total_mzn ?? 0),
    status: row.status,
    createdAt: row.created_at,
  };
}

export interface NewBookingInput {
  experienceId: string;
  date: string;
  /** HH:MM */
  time: string;
  people: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
}

/**
 * Creates a real booking. The customer comes from the session, and the price and
 * owning business are read from the database — never from the form. The database
 * trigger re-validates availability, capacity and generates the booking code.
 */
export async function createBooking(input: NewBookingInput): Promise<Booking> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("NOT_AUTHENTICATED");

  const { data: experience, error: experienceError } = await supabase
    .from("experiences")
    .select("id, business_id, price_mzn, active")
    .eq("id", input.experienceId)
    .maybeSingle();

  if (experienceError) throw new Error(experienceError.message);
  if (!experience || !experience.active) throw new Error("EXPERIENCE_UNAVAILABLE");

  const price = Number(experience.price_mzn ?? 0);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      experience_id: experience.id,
      business_id: experience.business_id,
      customer_id: userId,
      date: input.date,
      time: input.time.length === 5 ? `${input.time}:00` : input.time,
      people: input.people,
      customer_name: input.customerName,
      customer_phone: input.customerPhone ?? null,
      customer_email: input.customerEmail ?? null,
      notes: input.notes ?? null,
      // price snapshot taken from the database price at booking time
      total_mzn: price * input.people,
      status: "pending",
      code: "PENDING",
    })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapBooking(data as unknown as BookingRow);
}

/** Bookings of the signed-in customer (RLS returns only their own rows). */
export async function fetchMyBookings(): Promise<Booking[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("NOT_AUTHENTICATED");

  const { data, error } = await supabase
    .from("bookings")
    .select(SELECT)
    .eq("customer_id", userId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapBooking(row as unknown as BookingRow));
}

/**
 * Bookings for the experiences of the signed-in business owner.
 * RLS (`owns_business`) already restricts the rows — no business id from the client.
 */
export async function fetchBusinessBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapBooking(row as unknown as BookingRow));
}

/** Business owners may only move a booking to confirmed / rejected / completed. */
export async function updateBookingStatus(
  id: string,
  status: "confirmed" | "rejected" | "completed",
): Promise<void> {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Weekdays (0=Sunday) that have an active availability window for this experience. */
export async function fetchAvailableWeekdays(experienceId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("experience_availability")
    .select("day_of_week")
    .eq("experience_id", experienceId)
    .eq("active", true);

  if (error) throw new Error(error.message);
  return Array.from(new Set((data ?? []).map((row) => row.day_of_week)));
}

export function translateBookingError(message: string, lang: "pt" | "en"): string {
  const m = message.toLowerCase();
  if (m.includes("capacity exceeded")) {
    return lang === "pt"
      ? "Já não há lugares suficientes neste horário. Escolhe outro horário ou menos pessoas."
      : "There are no longer enough seats for this time. Pick another time or fewer people.";
  }
  if (m.includes("no availability configured")) {
    return lang === "pt"
      ? "Esta experiência não tem horários nesta data."
      : "This experience has no times on this date.";
  }
  if (m.includes("date cannot be in the past")) {
    return lang === "pt" ? "Escolhe uma data futura." : "Pick a future date.";
  }
  if (m.includes("not active")) {
    return lang === "pt" ? "Esta experiência não está disponível." : "This experience is unavailable.";
  }
  if (m === "not_authenticated") {
    return lang === "pt" ? "Inicia sessão para reservar." : "Sign in to book.";
  }
  return lang === "pt"
    ? "Não foi possível criar a reserva. Tenta novamente."
    : "We couldn't create the booking. Please try again.";
}
