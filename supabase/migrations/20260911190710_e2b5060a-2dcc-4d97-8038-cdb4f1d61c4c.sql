-- BLOCO 5.2 — hardening de bookings: disponibilidade, horário e overbooking
CREATE OR REPLACE FUNCTION public.bookings_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  exp_business_id uuid;
  exp_active boolean;
  slot_capacity integer;
  occupied integer;
BEGIN
  -- código sempre gerado pela BD, ignorando o que o cliente enviar
  NEW.code := public.generate_booking_code();

  -- reservas só no estado pending; apenas admin pode criar noutro estado
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.status := 'pending';
  END IF;

  IF NEW.date < current_date THEN
    RAISE EXCEPTION 'Booking date cannot be in the past';
  END IF;

  SELECT e.business_id, e.active INTO exp_business_id, exp_active
  FROM public.experiences e
  WHERE e.id = NEW.experience_id;

  IF exp_business_id IS NULL THEN
    RAISE EXCEPTION 'Experience not found';
  END IF;

  IF NEW.business_id IS DISTINCT FROM exp_business_id THEN
    RAISE EXCEPTION 'business_id does not match the owner business of the selected experience';
  END IF;

  IF exp_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Experience is not active and cannot be booked';
  END IF;

  -- bloqueio transacional por experiência+data+hora (evita race conditions)
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.experience_id::text || '|' || NEW.date::text || '|' || NEW."time"::text, 0)
  );

  -- janela de disponibilidade válida para o dia da semana e hora pedida
  SELECT a.capacity INTO slot_capacity
  FROM public.experience_availability a
  WHERE a.experience_id = NEW.experience_id
    AND a.active = true
    AND a.day_of_week = EXTRACT(DOW FROM NEW.date)::int
    AND NEW."time" >= a.start_time
    AND NEW."time" < a.end_time
  ORDER BY a.start_time
  LIMIT 1;

  IF slot_capacity IS NULL THEN
    RAISE EXCEPTION 'No availability configured for the requested date/time';
  END IF;

  -- ocupação atual: apenas pending + confirmed
  SELECT COALESCE(SUM(b.people), 0)::integer INTO occupied
  FROM public.bookings b
  WHERE b.experience_id = NEW.experience_id
    AND b.date = NEW.date
    AND b."time" = NEW."time"
    AND b.status IN ('pending'::public.booking_status, 'confirmed'::public.booking_status);

  IF occupied + NEW.people > slot_capacity THEN
    RAISE EXCEPTION 'Capacity exceeded: % of % seats already booked for this slot', occupied, slot_capacity;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.bookings_validate_insert() FROM PUBLIC;