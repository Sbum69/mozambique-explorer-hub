ALTER TABLE public.bookings ADD COLUMN decision_reason text;
COMMENT ON COLUMN public.bookings.decision_reason IS 'Motivo registado quando a empresa rejeita uma reserva pendente ou cancela uma reserva confirmada.';

ALTER TABLE public.experience_availability ADD COLUMN accepts_new_bookings boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.experience_availability.accepts_new_bookings IS 'false = horário fechado a novas reservas; reservas existentes ficam intactas.';

CREATE OR REPLACE FUNCTION public.bookings_validate_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  exp_business_id uuid;
  exp_active boolean;
  slot_capacity integer;
  occupied integer;
BEGIN
  NEW.code := public.generate_booking_code();
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
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.experience_id::text || '|' || NEW.date::text || '|' || NEW."time"::text, 0)
  );
  SELECT a.capacity INTO slot_capacity
  FROM public.experience_availability a
  WHERE a.experience_id = NEW.experience_id
    AND a.active = true
    AND a.accepts_new_bookings = true
    AND a.day_of_week = EXTRACT(DOW FROM NEW.date)::int
    AND NEW."time" >= a.start_time
    AND NEW."time" < a.end_time
  ORDER BY a.start_time
  LIMIT 1;
  IF slot_capacity IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.experience_availability a
      WHERE a.experience_id = NEW.experience_id
        AND a.active = true
        AND a.accepts_new_bookings = false
        AND a.day_of_week = EXTRACT(DOW FROM NEW.date)::int
        AND NEW."time" >= a.start_time
        AND NEW."time" < a.end_time
    ) THEN
      RAISE EXCEPTION 'Schedule closed to new bookings';
    END IF;
    RAISE EXCEPTION 'No availability configured for the requested date/time';
  END IF;
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

CREATE OR REPLACE FUNCTION public.bookings_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.id := OLD.id; NEW.code := OLD.code; NEW.customer_id := OLD.customer_id;
    NEW.business_id := OLD.business_id; NEW.experience_id := OLD.experience_id;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  NEW.id := OLD.id; NEW.code := OLD.code; NEW.customer_id := OLD.customer_id;
  NEW.business_id := OLD.business_id; NEW.experience_id := OLD.experience_id;
  NEW.date := OLD.date; NEW."time" := OLD."time"; NEW.people := OLD.people;
  NEW.customer_name := OLD.customer_name; NEW.customer_phone := OLD.customer_phone;
  NEW.customer_email := OLD.customer_email; NEW.notes := OLD.notes;
  NEW.total_mzn := OLD.total_mzn; NEW.created_at := OLD.created_at;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.decision_reason := OLD.decision_reason;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('cancelled'::public.booking_status, 'rejected'::public.booking_status, 'completed'::public.booking_status) THEN
    RAISE EXCEPTION 'Booking is in a final state';
  END IF;

  IF NEW.status = 'cancelled'::public.booking_status THEN
    IF OLD.customer_id = auth.uid() THEN
      IF OLD.status <> 'pending'::public.booking_status THEN
        RAISE EXCEPTION 'Only the customer can cancel a pending booking';
      END IF;
      NEW.decision_reason := NULL;
    ELSE
      IF NOT public.owns_business(OLD.business_id) OR OLD.status <> 'confirmed'::public.booking_status THEN
        RAISE EXCEPTION 'Only the business can cancel a confirmed booking';
      END IF;
      IF NEW.decision_reason IS NULL OR btrim(NEW.decision_reason) = '' THEN
        RAISE EXCEPTION 'REASON_REQUIRED';
      END IF;
      NEW.decision_reason := left(btrim(NEW.decision_reason), 1000);
    END IF;
  ELSIF NEW.status = 'rejected'::public.booking_status THEN
    IF NOT public.owns_business(OLD.business_id) OR OLD.status <> 'pending'::public.booking_status THEN
      RAISE EXCEPTION 'Only the business can reject a pending booking';
    END IF;
    IF NEW.decision_reason IS NULL OR btrim(NEW.decision_reason) = '' THEN
      RAISE EXCEPTION 'REASON_REQUIRED';
    END IF;
    NEW.decision_reason := left(btrim(NEW.decision_reason), 1000);
  ELSIF NEW.status = 'confirmed'::public.booking_status THEN
    IF NOT public.owns_business(OLD.business_id) OR OLD.status <> 'pending'::public.booking_status THEN
      RAISE EXCEPTION 'Only the business can confirm a pending booking';
    END IF;
    NEW.decision_reason := NULL;
  ELSIF NEW.status = 'completed'::public.booking_status THEN
    IF NOT public.owns_business(OLD.business_id) OR OLD.status <> 'confirmed'::public.booking_status THEN
      RAISE EXCEPTION 'Only the business can complete a confirmed booking';
    END IF;
    IF (OLD.date::timestamp + OLD."time") > now() THEN
      RAISE EXCEPTION 'BOOKING_NOT_YET_COMPLETED';
    END IF;
    NEW.decision_reason := NULL;
  ELSE
    RAISE EXCEPTION 'Invalid status transition';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bookings_notify_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t_pt text; t_en text; b_pt text; b_en text; exp_pt text; exp_en text; r_pt text; r_en text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status NOT IN ('confirmed','rejected','cancelled') THEN
    RETURN NEW;
  END IF;
  SELECT title_pt, COALESCE(title_en, title_pt) INTO exp_pt, exp_en FROM public.experiences WHERE id = NEW.experience_id;
  r_pt := COALESCE(' Motivo: ' || NULLIF(NEW.decision_reason, ''), '');
  r_en := COALESCE(' Reason: ' || NULLIF(NEW.decision_reason, ''), '');
  IF NEW.status = 'confirmed' THEN
    t_pt := 'Reserva confirmada'; t_en := 'Booking confirmed';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi confirmada.';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was confirmed.';
  ELSIF NEW.status = 'rejected' THEN
    t_pt := 'Reserva rejeitada'; t_en := 'Booking rejected';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi rejeitada pelo anfitrião.' || r_pt;
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was rejected by the host.' || r_en;
  ELSE
    t_pt := 'Reserva cancelada'; t_en := 'Booking cancelled';
    b_pt := 'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi cancelada.' || r_pt;
    b_en := 'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was cancelled.' || r_en;
  END IF;
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (NEW.customer_id, 'booking', t_pt, t_en, b_pt, b_en, '/bookings');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bookings_notify_new()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE owner uuid; exp_pt text; exp_en text;
BEGIN
  SELECT b.owner_id INTO owner FROM public.businesses b WHERE b.id = NEW.business_id;
  IF owner IS NULL THEN RETURN NEW; END IF;
  SELECT title_pt, COALESCE(title_en, title_pt) INTO exp_pt, exp_en FROM public.experiences WHERE id = NEW.experience_id;
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (owner, 'booking', 'Nova reserva', 'New booking',
    'Recebeste a reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' às ' || NEW."time" || '.',
    'You received booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' at ' || NEW."time" || '.',
    '/business-dashboard');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER bookings_notify_new_trg
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_notify_new();

CREATE OR REPLACE FUNCTION public.business_decide_booking(_booking_id uuid, _decision public.booking_status, _reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.bookings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL OR NOT public.owns_business(b.business_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _decision = 'confirmed' THEN
    UPDATE public.bookings SET status = 'confirmed', decision_reason = NULL
     WHERE id = b.id AND status = 'pending';
  ELSIF _decision = 'rejected' THEN
    IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    UPDATE public.bookings SET status = 'rejected', decision_reason = left(btrim(_reason), 1000)
     WHERE id = b.id AND status = 'pending';
  ELSIF _decision = 'cancelled' THEN
    IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    UPDATE public.bookings SET status = 'cancelled', decision_reason = left(btrim(_reason), 1000)
     WHERE id = b.id AND status = 'confirmed';
  ELSIF _decision = 'completed' THEN
    IF (b.date::timestamp + b."time") > now() THEN RAISE EXCEPTION 'BOOKING_NOT_YET_COMPLETED'; END IF;
    UPDATE public.bookings SET status = 'completed', decision_reason = NULL
     WHERE id = b.id AND status = 'confirmed';
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'ALREADY_DECIDED'; END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.business_decide_booking(uuid, public.booking_status, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_experience_availability(_experience_id uuid, _date date)
 RETURNS TABLE(experience_id uuid, date date, start_time time without time zone, end_time time without time zone, capacity integer, booked_people integer, remaining_capacity integer, available boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT a.experience_id,_date,a.start_time,a.end_time,a.capacity,public.booked_people(a.experience_id,_date,a.start_time),greatest(0,a.capacity-public.booked_people(a.experience_id,_date,a.start_time)),(_date>=current_date AND a.capacity>public.booked_people(a.experience_id,_date,a.start_time)) FROM public.experience_availability a JOIN public.experiences e ON e.id=a.experience_id WHERE a.experience_id=_experience_id AND a.active AND a.accepts_new_bookings AND e.active AND public.commercial_activity_public(e.business_id) AND a.day_of_week=extract(dow FROM _date)::int ORDER BY a.start_time;
$function$;