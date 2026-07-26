export type BookingStatus = "pending" | "confirmed" | "rejected";

export interface Booking {
  id: string;
  experienceId: string;
  experienceTitle: { pt: string; en: string };
  host: string;
  location: string;
  image: string;
  priceMzn: number;
  durationHours: number;
  date: string;
  time: string;
  people: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  totalMzn: number;
  status: BookingStatus;
  createdAt: number;
  code: string;
}

const KEY = "ekaya.bookings";

export function getBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveBookings(list: Booking[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("ekaya:bookings-changed"));
}

export function addBooking(b: Booking) {
  const list = getBookings();
  list.unshift(b);
  saveBookings(list);
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  const list = getBookings().map((b) => (b.id === id ? { ...b, status } : b));
  saveBookings(list);
}

export function generateBookingCode() {
  return "EK-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}
