REVOKE ALL ON FUNCTION public.bookings_validate_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bookings_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_booking_code() FROM PUBLIC, anon, authenticated;