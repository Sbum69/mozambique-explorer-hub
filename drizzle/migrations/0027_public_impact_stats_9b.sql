CREATE OR REPLACE FUNCTION public.platform_impact_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      'cancelled', count(*) FILTER (WHERE status='cancelled')) FROM public.bookings),
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
$$;
REVOKE ALL ON FUNCTION public.platform_impact_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_impact_stats() TO anon, authenticated;