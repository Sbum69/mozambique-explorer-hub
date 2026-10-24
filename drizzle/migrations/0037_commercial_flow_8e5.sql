-- 8E.5: integrated commercial flow.
-- * no_show: final state, only the business owner, only a confirmed booking whose start has passed.
-- * Automatic expiry: stale pending bookings become cancelled with reason AUTO_EXPIRED.
-- * Admin detail edits on a live booking must fit the slot capacity (same per-activity lock).
-- * Booking times are Mozambique local times: "has started" is compared with Africa/Maputo time.
-- * Notifications for expiry, admin cancellation (owner), completion and no-show.
-- No table, data or RLS changes.

CREATE OR REPLACE FUNCTION public.bookings_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
  local_now timestamp := now() AT TIME ZONE 'Africa/Maputo';
  slot_capacity integer;
  occupied integer;
BEGIN
  NEW.id := OLD.id; NEW.code := OLD.code; NEW.customer_id := OLD.customer_id;
  NEW.business_id := OLD.business_id; NEW.experience_id := OLD.experience_id;
  NEW.created_at := OLD.created_at;

  IF is_admin AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    -- Admin corrections on a live booking must still fit the slot (same lock as new bookings).
    IF OLD.status IN ('pending'::public.booking_status, 'confirmed'::public.booking_status)
       AND (NEW.people IS DISTINCT FROM OLD.people OR NEW.date IS DISTINCT FROM OLD.date
            OR NEW."time" IS DISTINCT FROM OLD."time") THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('commercial:'||NEW.experience_id::text, 0));
      SELECT a.capacity INTO slot_capacity
        FROM public.experience_availability a
       WHERE a.experience_id = NEW.experience_id AND a.active
         AND a.day_of_week = extract(dow FROM NEW.date)::int AND a.start_time = NEW."time";
      IF slot_capacity IS NULL THEN
        RAISE EXCEPTION 'No availability configured for requested start time';
      END IF;
      SELECT COALESCE(sum(b.people), 0)::integer INTO occupied
        FROM public.bookings b
       WHERE b.experience_id = NEW.experience_id AND b.date = NEW.date AND b."time" = NEW."time"
         AND b.status IN ('pending'::public.booking_status, 'confirmed'::public.booking_status)
         AND b.id <> OLD.id;
      IF occupied + NEW.people > slot_capacity THEN
        RAISE EXCEPTION 'Capacity exceeded: % of % seats already booked for this slot', occupied, slot_capacity;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  NEW.date := OLD.date; NEW."time" := OLD."time"; NEW.people := OLD.people;
  NEW.customer_name := OLD.customer_name; NEW.customer_phone := OLD.customer_phone;
  NEW.customer_email := OLD.customer_email; NEW.notes := OLD.notes;
  NEW.total_mzn := OLD.total_mzn;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.decision_reason := OLD.decision_reason;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('cancelled'::public.booking_status, 'rejected'::public.booking_status,
                    'completed'::public.booking_status, 'no_show'::public.booking_status) THEN
    RAISE EXCEPTION 'Booking is in a final state';
  END IF;

  -- Scheduled expiry (server side, no user session): only pending bookings whose start has passed.
  IF auth.uid() IS NULL AND NEW.status = 'cancelled'::public.booking_status
     AND NEW.decision_reason = 'AUTO_EXPIRED' THEN
    IF OLD.status <> 'pending'::public.booking_status OR (OLD.date + OLD."time") >= local_now THEN
      RAISE EXCEPTION 'BOOKING_NOT_EXPIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF is_admin AND NEW.status = 'cancelled'::public.booking_status THEN
    IF NEW.decision_reason IS NULL OR btrim(NEW.decision_reason) = '' THEN
      RAISE EXCEPTION 'REASON_REQUIRED';
    END IF;
    NEW.decision_reason := left(btrim(NEW.decision_reason), 1000);
    RETURN NEW;
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
    IF (OLD.date + OLD."time") > local_now THEN
      RAISE EXCEPTION 'BOOKING_NOT_YET_COMPLETED';
    END IF;
    NEW.decision_reason := NULL;
  ELSIF NEW.status = 'no_show'::public.booking_status THEN
    IF NOT public.owns_business(OLD.business_id) OR OLD.status <> 'confirmed'::public.booking_status THEN
      RAISE EXCEPTION 'Only the business can mark a confirmed booking as no-show';
    END IF;
    IF (OLD.date + OLD."time") > local_now THEN
      RAISE EXCEPTION 'BOOKING_NOT_YET_STARTED';
    END IF;
    NEW.decision_reason := NULL;
  ELSE
    RAISE EXCEPTION 'Invalid status transition';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.business_decide_booking(_booking_id uuid, _decision booking_status, _reason text DEFAULT NULL::text)
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
    IF (b.date + b."time") > (now() AT TIME ZONE 'Africa/Maputo') THEN RAISE EXCEPTION 'BOOKING_NOT_YET_COMPLETED'; END IF;
    UPDATE public.bookings SET status = 'completed', decision_reason = NULL
     WHERE id = b.id AND status = 'confirmed';
  ELSIF _decision = 'no_show' THEN
    IF (b.date + b."time") > (now() AT TIME ZONE 'Africa/Maputo') THEN RAISE EXCEPTION 'BOOKING_NOT_YET_STARTED'; END IF;
    UPDATE public.bookings SET status = 'no_show', decision_reason = NULL
     WHERE id = b.id AND status = 'confirmed';
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'ALREADY_DECIDED'; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bookings_notify_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t_pt text; t_en text; b_pt text; b_en text; exp_pt text; exp_en text; r_pt text; r_en text; owner uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status NOT IN ('confirmed','rejected','cancelled','completed','no_show') THEN
    RETURN NEW;
  END IF;
  SELECT title_pt, COALESCE(title_en, title_pt) INTO exp_pt, exp_en FROM public.experiences WHERE id = NEW.experience_id;
  SELECT b.owner_id INTO owner FROM public.businesses b WHERE b.id = NEW.business_id;
  r_pt := COALESCE(' Motivo: ' || NULLIF(NEW.decision_reason, ''), '');
  r_en := COALESCE(' Reason: ' || NULLIF(NEW.decision_reason, ''), '');

  -- Tourist cancelled their own booking: tell the business owner, not the tourist.
  IF NEW.status = 'cancelled' AND auth.uid() IS NOT NULL AND auth.uid() = NEW.customer_id THEN
    IF owner IS NOT NULL AND owner <> NEW.customer_id THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (owner, 'booking', 'Reserva cancelada pelo cliente', 'Booking cancelled by customer',
        'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' foi cancelada pelo cliente.',
        'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' was cancelled by the customer.',
        '/business-dashboard');
    END IF;
    RETURN NEW;
  END IF;

  -- Expired without an answer: tell both sides.
  IF NEW.status = 'cancelled' AND NEW.decision_reason = 'AUTO_EXPIRED' THEN
    INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
    VALUES (NEW.customer_id, 'booking', 'Reserva expirada', 'Booking expired',
      'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' expirou sem resposta do negócio e foi cancelada.',
      'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' expired without an answer from the business and was cancelled.',
      '/bookings');
    IF owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (owner, 'booking', 'Reserva expirada', 'Booking expired',
        'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' expirou sem resposta e foi cancelada automaticamente.',
        'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' expired without an answer and was cancelled automatically.',
        '/business-dashboard');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmed' THEN
    t_pt := 'Reserva confirmada'; t_en := 'Booking confirmed';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi confirmada.';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was confirmed.';
  ELSIF NEW.status = 'rejected' THEN
    t_pt := 'Reserva rejeitada'; t_en := 'Booking rejected';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi rejeitada pelo anfitrião.' || r_pt;
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was rejected by the host.' || r_en;
  ELSIF NEW.status = 'completed' THEN
    t_pt := 'Atividade concluída'; t_en := 'Activity completed';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi marcada como concluída. Obrigado por participares!';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was marked as completed. Thank you for taking part!';
  ELSIF NEW.status = 'no_show' THEN
    t_pt := 'Não compareceste'; t_en := 'Marked as no-show';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' foi marcada como não comparência pelo anfitrião.';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' was marked as a no-show by the host.';
  ELSE
    t_pt := 'Reserva cancelada'; t_en := 'Booking cancelled';
    b_pt := 'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi cancelada.' || r_pt;
    b_en := 'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was cancelled.' || r_en;
  END IF;
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (NEW.customer_id, 'booking', t_pt, t_en, b_pt, b_en, '/bookings');

  -- Cancelled by someone other than the business (admin or server): tell the owner too.
  IF NEW.status = 'cancelled' AND owner IS NOT NULL AND auth.uid() IS DISTINCT FROM owner THEN
    INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
    VALUES (owner, 'booking', 'Reserva cancelada pela administração', 'Booking cancelled by the administration',
      'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' foi cancelada pela administração.' || r_pt,
      'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' was cancelled by the administration.' || r_en,
      '/business-dashboard');
  END IF;
  RETURN NEW;
END;
$function$;

-- Cancels pending bookings whose start (Mozambique time) has passed. Returns how many expired.
CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  UPDATE public.bookings
     SET status = 'cancelled', decision_reason = 'AUTO_EXPIRED'
   WHERE status = 'pending'
     AND (date + "time") < (now() AT TIME ZONE 'Africa/Maputo');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.expire_stale_bookings() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.platform_impact_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH done AS (
  SELECT b.business_id, b.people, e.province FROM public.bookings b
  JOIN public.experiences e ON e.id = b.experience_id
  WHERE b.status = 'completed'
    AND (b.date::timestamp + b."time") <= (now() AT TIME ZONE 'Africa/Maputo')
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'platform', jsonb_build_object(
    'destinations', (SELECT count(*) FROM public.destinations),
    'active_activities', (SELECT count(*) FROM public.experiences e WHERE e.active AND public.commercial_activity_public(e.business_id)),
    'approved_businesses', (SELECT count(*) FROM public.businesses WHERE status = 'approved'),
    'community_experiences', (SELECT count(*) FROM public.community_experiences WHERE status = 'approved'),
    'public_routes', (SELECT count(*) FROM public.routes WHERE is_public AND status = 'active' AND review_status = 'approved'),
    'accounts', (SELECT count(*) FROM public.profiles),
    'bookings_total', (SELECT count(*) FROM public.bookings),
    'bookings_by_status', (SELECT jsonb_build_object(
      'pending', count(*) FILTER (WHERE status='pending'),
      'confirmed', count(*) FILTER (WHERE status='confirmed'),
      'completed', count(*) FILTER (WHERE status='completed'),
      'rejected', count(*) FILTER (WHERE status='rejected'),
      'cancelled', count(*) FILTER (WHERE status='cancelled'),
      'no_show', count(*) FILTER (WHERE status='no_show')) FROM public.bookings),
    'activities_by_province', (SELECT COALESCE(jsonb_object_agg(p, n), '{}'::jsonb) FROM (
      SELECT COALESCE(NULLIF(e.province,''),'—') p, count(*) n FROM public.experiences e
      WHERE e.active AND public.commercial_activity_public(e.business_id) GROUP BY 1) s)
  ),
  'verified', jsonb_build_object(
    'completed_bookings', (SELECT count(*) FROM done),
    'completed_people', (SELECT COALESCE(sum(people),0) FROM done),
    'businesses_with_completed', (SELECT count(DISTINCT business_id) FROM done),
    'completed_routes', (SELECT count(*) FROM public.route_progress WHERE status = 'completed' AND completed_at IS NOT NULL),
    'stops_with_proof', (SELECT count(*) FROM public.route_stop_progress WHERE photo_path IS NOT NULL AND btrim(photo_path) <> ''),
    'completed_by_province', (SELECT COALESCE(jsonb_object_agg(p, n), '{}'::jsonb) FROM (
      SELECT COALESCE(NULLIF(province,''),'—') p, count(*) n FROM done GROUP BY 1 HAVING count(*) >= 3) s)
  )
);
$function$;

-- Daily expiry at 00:15 Mozambique time (22:15 UTC), when pg_cron can be enabled.
-- If it cannot, nothing fails: expire_stale_bookings() must then be called by another scheduler.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      PERFORM cron.schedule('ekaya-expire-stale-bookings', '15 22 * * *', 'SELECT public.expire_stale_bookings()');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron not enabled (%): schedule public.expire_stale_bookings() elsewhere', SQLERRM;
    END;
  END IF;
END $$;
