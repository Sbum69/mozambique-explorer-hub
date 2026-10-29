-- DADOS-2 — Internal accounts (test accounts) and metrics without them.

-- 1) Flag, changed only by an admin (the profile guard from 0046 also keeps it for non-admins).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.deleted_at := OLD.deleted_at;
  NEW.is_internal := OLD.is_internal;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT is_internal FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_internal_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_internal_user(uuid) TO authenticated;

-- Admin sets or clears the flag (from the admin users list).
CREATE OR REPLACE FUNCTION public.admin_set_internal(_user_id uuid, _internal boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE public.profiles SET is_internal = coalesce(_internal, false) WHERE id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_internal(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_internal(uuid, boolean) TO authenticated;

-- 2) Public impact numbers: internal accounts and everything they own are left out
--    (accounts, their businesses and those businesses' activities/bookings, their bookings,
--    itineraries, community experiences and route progress). Deleted (anonymised) accounts too.
CREATE OR REPLACE FUNCTION public.platform_impact_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH internal AS (
  SELECT id FROM public.profiles WHERE is_internal OR deleted_at IS NOT NULL
), biz AS (
  SELECT * FROM public.businesses b WHERE b.owner_id IS NULL OR b.owner_id NOT IN (SELECT id FROM internal)
), bk AS (
  SELECT b.* FROM public.bookings b
   WHERE b.customer_id NOT IN (SELECT id FROM internal) AND b.business_id IN (SELECT id FROM biz)
), done AS (
  SELECT b.business_id, b.people, e.province FROM bk b
  JOIN public.experiences e ON e.id = b.experience_id
  WHERE b.status = 'completed'
    AND (b.date::timestamp + b."time") <= (now() AT TIME ZONE 'Africa/Maputo')
), acts AS (
  SELECT e.* FROM public.experiences e
   WHERE e.active AND e.business_id IN (SELECT id FROM biz) AND public.commercial_activity_public(e.business_id)
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'platform', jsonb_build_object(
    'destinations', (SELECT count(*) FROM public.destinations),
    'active_activities', (SELECT count(*) FROM acts),
    'approved_businesses', (SELECT count(*) FROM biz WHERE status = 'approved'),
    'community_experiences', (SELECT count(*) FROM public.community_experiences
                               WHERE status = 'approved'
                                 AND (submitted_by IS NULL OR submitted_by NOT IN (SELECT id FROM internal))),
    'public_routes', (SELECT count(*) FROM public.routes
                       WHERE is_public AND status = 'active' AND review_status = 'approved'
                         AND (owner_id IS NULL OR owner_id NOT IN (SELECT id FROM internal))),
    'accounts', (SELECT count(*) FROM public.profiles WHERE id NOT IN (SELECT id FROM internal)),
    'bookings_total', (SELECT count(*) FROM bk),
    'bookings_by_status', (SELECT jsonb_build_object(
      'pending', count(*) FILTER (WHERE status='pending'),
      'confirmed', count(*) FILTER (WHERE status='confirmed'),
      'completed', count(*) FILTER (WHERE status='completed'),
      'rejected', count(*) FILTER (WHERE status='rejected'),
      'cancelled', count(*) FILTER (WHERE status='cancelled'),
      'no_show', count(*) FILTER (WHERE status='no_show')) FROM bk),
    'activities_by_province', (SELECT COALESCE(jsonb_object_agg(p, n), '{}'::jsonb) FROM (
      SELECT COALESCE(NULLIF(province,''),'—') p, count(*) n FROM acts GROUP BY 1) s)
  ),
  'verified', jsonb_build_object(
    'completed_bookings', (SELECT count(*) FROM done),
    'completed_people', (SELECT COALESCE(sum(people),0) FROM done),
    'businesses_with_completed', (SELECT count(DISTINCT business_id) FROM done),
    'completed_routes', (SELECT count(*) FROM public.route_progress
                          WHERE status = 'completed' AND completed_at IS NOT NULL
                            AND user_id NOT IN (SELECT id FROM internal)),
    'stops_with_proof', (SELECT count(*) FROM public.route_stop_progress sp
                          JOIN public.route_progress rp ON rp.id = sp.progress_id
                          WHERE sp.photo_path IS NOT NULL AND btrim(sp.photo_path) <> ''
                            AND rp.user_id NOT IN (SELECT id FROM internal)),
    'completed_by_province', (SELECT COALESCE(jsonb_object_agg(p, n), '{}'::jsonb) FROM (
      SELECT COALESCE(NULLIF(province,''),'—') p, count(*) n FROM done GROUP BY 1 HAVING count(*) >= 3) s)
  )
);
$function$;

-- 3) Admin dashboard summary with the same exclusions (replaces the raw table counts).
CREATE OR REPLACE FUNCTION public.admin_platform_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  WITH internal AS (
    SELECT id FROM public.profiles WHERE is_internal OR deleted_at IS NOT NULL
  ), biz AS (
    SELECT * FROM public.businesses b WHERE b.owner_id IS NULL OR b.owner_id NOT IN (SELECT id FROM internal)
  )
  SELECT jsonb_build_object(
    'profiles', (SELECT count(*) FROM public.profiles WHERE id NOT IN (SELECT id FROM internal)),
    'internal_profiles', (SELECT count(*) FROM public.profiles WHERE is_internal),
    'businesses', (SELECT count(*) FROM biz),
    'activities', (SELECT count(*) FROM public.experiences WHERE business_id IN (SELECT id FROM biz)),
    'bookings', (SELECT count(*) FROM public.bookings
                  WHERE business_id IN (SELECT id FROM biz) AND customer_id NOT IN (SELECT id FROM internal)),
    'pending', (SELECT count(*) FROM biz WHERE status = 'pending')
  ) INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_platform_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_summary() TO authenticated;

-- 4) The three test accounts (tourist, business with "EKAYA Teste — não reservar", admin) are internal.
UPDATE public.profiles SET is_internal = true
 WHERE id IN ('c87c29c3-24de-4f0a-ab3e-5dcb7c698c53',  -- test tourist
              '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa',  -- test business
              '0c05a5bc-1653-403c-81bb-57a14e83d52f'); -- test admin
