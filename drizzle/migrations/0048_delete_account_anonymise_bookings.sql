-- UX-1 fix — delete_my_account (0046) anonymised everything except the bookings: the booking guard
-- puts the customer's name, contacts and notes back for anyone who is not an admin.
-- Now the guard accepts exactly that change when delete_my_account asks for it: no user session
-- (the function drops the claims first) and the transaction-local flag ekaya.anonymise = 'on'.
-- Only customer_name / customer_phone / customer_email / notes may change; everything else stays.

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

  -- Account deletion (delete_my_account): personal fields only, nothing else moves.
  IF auth.uid() IS NULL AND coalesce(current_setting('ekaya.anonymise', true), '') = 'on' THEN
    NEW.date := OLD.date; NEW."time" := OLD."time"; NEW.people := OLD.people;
    NEW.total_mzn := OLD.total_mzn; NEW.status := OLD.status; NEW.decision_reason := OLD.decision_reason;
    RETURN NEW;
  END IF;

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

-- delete_my_account: the session claims are dropped and the flag is set BEFORE the bookings change.
CREATE OR REPLACE FUNCTION public.delete_my_account(_confirm text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  keeps_records boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF coalesce(btrim(_confirm), '') NOT IN ('APAGAR', 'DELETE') THEN RAISE EXCEPTION 'CONFIRMATION_REQUIRED'; END IF;

  is_admin := public.has_role(uid, 'admin');
  IF is_admin AND (SELECT count(*) FROM public.user_roles r
                    JOIN public.profiles p ON p.id = r.user_id
                   WHERE r.role = 'admin' AND p.deleted_at IS NULL) <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b JOIN public.businesses s ON s.id = b.business_id
              WHERE s.owner_id = uid AND b.date >= current_date AND b.status IN ('pending', 'confirmed')) THEN
    RAISE EXCEPTION 'BUSINESS_HAS_FUTURE_BOOKINGS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b
              WHERE b.customer_id = uid AND b.date >= current_date AND b.status IN ('pending', 'confirmed')) THEN
    RAISE EXCEPTION 'HAS_FUTURE_BOOKINGS';
  END IF;

  DELETE FROM public.routes WHERE owner_id = uid AND NOT (is_public AND review_status = 'approved');

  keeps_records := EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = uid)
                OR EXISTS (SELECT 1 FROM public.bookings WHERE customer_id = uid);
  IF NOT keeps_records THEN
    DELETE FROM auth.users WHERE id = uid;
    RETURN 'deleted';
  END IF;

  DELETE FROM public.favorites WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.community_post_reactions WHERE user_id = uid;
  DELETE FROM public.community_posts WHERE author_id = uid;
  DELETE FROM public.destination_visits WHERE user_id = uid;
  DELETE FROM public.news_likes WHERE user_id = uid;
  DELETE FROM public.event_participations WHERE user_id = uid;
  DELETE FROM public.profile_provinces WHERE profile_id = uid;
  DELETE FROM public.route_progress WHERE user_id = uid;
  -- From here on the guards see no user session (uid was read above); bookings and businesses
  -- accept the anonymisation / suspension only in this state.
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('ekaya.anonymise', 'on', true);
  UPDATE public.bookings SET customer_name = 'Conta apagada', customer_phone = NULL,
         customer_email = NULL, notes = NULL
   WHERE customer_id = uid;
  PERFORM set_config('ekaya.anonymise', 'off', true);
  UPDATE public.businesses SET status = 'suspended' WHERE owner_id = uid AND status <> 'suspended';
  DELETE FROM public.user_roles WHERE user_id = uid;
  UPDATE public.profiles SET display_name = 'Conta apagada', avatar_url = NULL, phone = NULL,
         province = NULL, duration_days = NULL, interests = '{}', muted_notification_types = '{}',
         deleted_at = now()
   WHERE id = uid;

  DELETE FROM auth.sessions WHERE user_id = uid;
  DELETE FROM auth.refresh_tokens WHERE user_id = uid::text;
  DELETE FROM auth.identities WHERE user_id = uid;
  UPDATE auth.users SET email = 'deleted-' || uid::text || '@ekaya.invalid', phone = NULL,
         encrypted_password = NULL, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity'
   WHERE id = uid;
  RETURN 'anonymised';
END $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;
