-- Self-reverting test of 0067 (save_route_plan keeps travel stops and stop sources). One DO block;
-- it always ends with RAISE EXCEPTION 'TEST_0067_ROLLBACK …', so nothing stays in the database.
-- The runner replaces the marker line of step 2 with EXECUTE $mig$<0067 file>$mig$;
-- Users are picked by role (internal test account), never by email. The plan copied is the real
-- official itinerary EK-NAM-004, serialised like the app does (stopToInput in src/lib/routes.ts).
DO $t$
DECLARE
  tourist uuid; src uuid; inp jsonb; neg jsonb; rid uuid; r record;
  before_err text; e_admin text; e_kind text; e_travel text; e_custom text; e_anon text;
  src_stops_before int; src_stops_after int;
BEGIN
  SELECT p.id INTO tourist FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'tourist'
   WHERE p.is_internal ORDER BY p.created_at LIMIT 1;
  SELECT id INTO src FROM routes WHERE unique_code = 'EK-NAM-004';
  SELECT count(*) INTO src_stops_before FROM route_stops s JOIN route_days d ON d.id = s.route_day_id WHERE d.route_id = src;

  SELECT jsonb_build_object(
    'title', r0.title, 'titleEn', r0.title_en, 'description', r0.description, 'descriptionEn', r0.description_en,
    'subtitlePt', r0.subtitle_pt, 'subtitleEn', r0.subtitle_en, 'provinceId', r0.province_id,
    'interests', to_jsonb(coalesce(r0.interests, '{}')), 'intensity', r0.intensity, 'isPublic', false,
    'sourceRouteId', r0.id,
    'days', (SELECT jsonb_agg(jsonb_build_object(
        'title', d.title, 'titleEn', d.title_en, 'description', d.description, 'isUnassigned', d.is_unassigned,
        'stops', (SELECT coalesce(jsonb_agg(jsonb_build_object(
            'kind', CASE s.stop_type WHEN 'activity' THEN 'experience' WHEN 'community_experience' THEN 'community'
                    WHEN 'custom_stop' THEN 'custom' ELSE s.stop_type END,
            'refId', coalesce(s.destination_id, s.experience_id, s.community_experience_id),
            'title', s.custom_title_pt, 'titleEn', s.custom_title_en,
            'descriptionPt', s.description_pt, 'descriptionEn', s.description_en, 'location', s.location,
            'lat', s.lat, 'lng', s.lng, 'isFree', s.is_free, 'notes', s.notes,
            'estimatedDurationMinutes', s.estimated_duration_minutes,
            'pendingValidation', s.validation_status = 'pending_validation',
            'communityCandidate', s.community_candidate,
            'sourceUrl', s.source_url, 'sourceLabel', s.source_label, 'travelMinutes', s.travel_minutes)
          ORDER BY s.stop_order), '[]'::jsonb) FROM route_stops s WHERE s.route_day_id = d.id))
      ORDER BY d.day_number) FROM route_days d WHERE d.route_id = r0.id))
  INTO inp FROM routes r0 WHERE r0.id = src;
  -- A second copy of the same source is refused by routes_owner_source_unique: the refusal checks
  -- below use the plan without sourceRouteId, so each one meets the error it is testing.
  neg := inp - 'sourceRouteId';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tourist, 'role', 'authenticated')::text, true);

  -- 1. Before 0067: copying the itinerary fails.
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.save_route_plan(NULL, inp, false); EXCEPTION WHEN OTHERS THEN before_err := SQLERRM; END;
  RESET ROLE;

  -- 2. Apply 0067.
  -- @@MIGRATION@@

  -- 3. After 0067: the traveller's copy keeps every stop, the travel stop and the sources.
  SET LOCAL ROLE authenticated;
  rid := public.save_route_plan(NULL, inp, false);
  SELECT count(*) AS stops,
         count(*) FILTER (WHERE s.stop_type = 'travel') AS travel,
         count(*) FILTER (WHERE s.source_url LIKE 'https://%') AS with_source,
         count(*) FILTER (WHERE s.stop_type = 'destination' AND s.destination_id IS NOT NULL) AS dest,
         (SELECT owner_id = tourist AND NOT is_curated AND NOT is_public AND source_route_id = src FROM routes WHERE id = rid) AS own_copy
    INTO r FROM route_stops s JOIN route_days d ON d.id = s.route_day_id WHERE d.route_id = rid;

  -- 4. The same checks as before still hold.
  BEGIN PERFORM public.save_route_plan(NULL, neg, true); EXCEPTION WHEN OTHERS THEN e_admin := SQLERRM; END;
  BEGIN PERFORM public.save_route_plan(NULL, jsonb_set(neg, '{days,0,stops,0,kind}', '"teleport"'), false);
  EXCEPTION WHEN OTHERS THEN e_kind := SQLERRM; END;
  -- a travel time needs a source (table constraint)
  BEGIN PERFORM public.save_route_plan(NULL, jsonb_set(neg, '{days,1,stops,0,travelMinutes}', '60'), false);
  EXCEPTION WHEN OTHERS THEN e_travel := SQLERRM; END;
  -- a confirmed custom stop needs a source (0064 constraint)
  BEGIN PERFORM public.save_route_plan(NULL, jsonb_set(neg, '{days,0,stops,1,sourceUrl}', 'null'), false);
  EXCEPTION WHEN OTHERS THEN e_custom := SQLERRM; END;
  RESET ROLE;

  SELECT count(*) INTO src_stops_after FROM route_stops s JOIN route_days d ON d.id = s.route_day_id WHERE d.route_id = src;

  -- 5. Visitors (anon) cannot save.
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN PERFORM public.save_route_plan(NULL, neg, false); EXCEPTION WHEN OTHERS THEN e_anon := SQLERRM; END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_0067_ROLLBACK before: % | after: stops=% travel=% with_source=% dest=% own_copy=% | admin: % | kind: % | travel without source: % | custom without source: % | anon: % | original_stops=%->%',
    coalesce(before_err, 'accepted'), r.stops, r.travel, r.with_source, r.dest, r.own_copy,
    coalesce(e_admin, 'accepted'), coalesce(e_kind, 'accepted'), coalesce(e_travel, 'accepted'),
    coalesce(e_custom, 'accepted'), coalesce(e_anon, 'accepted'), src_stops_before, src_stops_after;
END $t$;
