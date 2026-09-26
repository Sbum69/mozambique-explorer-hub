CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- final states are immutable for non-admins
    IF OLD.status IN ('cancelled'::public.booking_status, 'rejected'::public.booking_status, 'completed'::public.booking_status) THEN
      RAISE EXCEPTION 'Booking is in a final state';
    END IF;
    IF NEW.status = 'cancelled'::public.booking_status THEN
      IF OLD.customer_id <> auth.uid() OR OLD.status <> 'pending'::public.booking_status THEN
        RAISE EXCEPTION 'Only the customer can cancel a pending booking';
      END IF;
    ELSIF NEW.status NOT IN ('confirmed'::public.booking_status, 'rejected'::public.booking_status, 'completed'::public.booking_status)
       OR NOT public.owns_business(OLD.business_id) THEN
      RAISE EXCEPTION 'Business owners can only set status to confirmed, rejected or completed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_my_booking(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  UPDATE public.bookings SET status = 'cancelled'
   WHERE id = _booking_id AND customer_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_CANCELLABLE'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_my_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_booking(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bookings_notify_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_pt text; t_en text; b_pt text; b_en text; exp_pt text; exp_en text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status NOT IN ('confirmed','rejected','cancelled') THEN
    RETURN NEW;
  END IF;
  SELECT title_pt, COALESCE(title_en, title_pt) INTO exp_pt, exp_en FROM public.experiences WHERE id = NEW.experience_id;
  IF NEW.status = 'confirmed' THEN
    t_pt := 'Reserva confirmada'; t_en := 'Booking confirmed';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi confirmada.';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was confirmed.';
  ELSIF NEW.status = 'rejected' THEN
    t_pt := 'Reserva rejeitada'; t_en := 'Booking rejected';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi rejeitada pelo anfitrião.';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was rejected by the host.';
  ELSE
    t_pt := 'Reserva cancelada'; t_en := 'Booking cancelled';
    b_pt := 'Cancelaste a reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '".';
    b_en := 'You cancelled booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '".';
  END IF;
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (NEW.customer_id, 'booking', t_pt, t_en, b_pt, b_en, '/bookings');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_notify_status_trg ON public.bookings;
CREATE TRIGGER bookings_notify_status_trg AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_notify_status();