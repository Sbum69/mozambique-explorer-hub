-- SEG-2 (P20): admins no longer bypass booking status transitions.
-- Admins may still correct booking details while the status is unchanged (previous behaviour),
-- and may cancel a pending or confirmed booking with a mandatory reason. A booking in a final
-- state (cancelled, rejected, completed) can never change status. Every other transition follows
-- the existing owner/customer rules unchanged.
-- P21 needs no change: commercial_booking_guard already requires the exact slot start time and
-- takes the per-activity lock shared with availability edits.
CREATE OR REPLACE FUNCTION public.bookings_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  NEW.id := OLD.id; NEW.code := OLD.code; NEW.customer_id := OLD.customer_id;
  NEW.business_id := OLD.business_id; NEW.experience_id := OLD.experience_id;
  NEW.created_at := OLD.created_at;

  IF is_admin AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
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

  IF OLD.status IN ('cancelled'::public.booking_status, 'rejected'::public.booking_status, 'completed'::public.booking_status) THEN
    RAISE EXCEPTION 'Booking is in a final state';
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
