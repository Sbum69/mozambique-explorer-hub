import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { translateBookingError } from "./bookings";

// Messages raised by the database guards (commercial_booking_guard / bookings_validate_insert).
describe("SEG-2 booking errors shown to the tourist", () => {
  it("explains an over-capacity slot instead of a generic failure", () => {
    const msg = "Capacity exceeded: 2 of 2 seats already booked for this slot";
    expect(translateBookingError(msg, "pt")).toMatch(/lugares suficientes/);
    expect(translateBookingError(msg, "en")).toMatch(/enough seats/);
  });
  it("a time that is not a slot start is reported as unavailable", () => {
    const msg = "No availability configured for requested start time";
    expect(translateBookingError(msg, "pt")).toMatch(/não tem horários/);
    expect(translateBookingError(msg, "en")).toMatch(/no times/);
  });
  it("a schedule closed to new bookings is reported as closed", () => {
    expect(translateBookingError("Schedule closed to new bookings", "en")).toMatch(/closed/);
  });
  it("unknown database errors never leak raw text", () => {
    const raw = "Booking is in a final state";
    expect(translateBookingError(raw, "pt")).not.toContain(raw);
    expect(translateBookingError(raw, "en")).toMatch(/couldn't create the booking/);
  });
});
