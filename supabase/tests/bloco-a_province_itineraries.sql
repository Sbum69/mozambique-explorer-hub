-- Bloco A (0064): run AFTER the migration; self-reverting (ends with RAISE … ROLLBACK).
DO $$
DECLARE r text := ''; rid uuid; prov uuid; day uuid; ok boolean; n int;
BEGIN
  -- 1. every route has a province
  BEGIN UPDATE public.routes SET province_id = NULL WHERE id = (SELECT id FROM public.routes LIMIT 1);
    r := r || 'FAIL province nullable; '; EXCEPTION WHEN not_null_violation THEN r := r || 'PASS province required; '; END;
  -- 2. route_provinces: RLS on, anon reads only, cannot write
  SELECT relrowsecurity INTO ok FROM pg_class WHERE oid = 'public.route_provinces'::regclass;
  r := r || CASE WHEN ok THEN 'PASS rls on; ' ELSE 'FAIL rls off; ' END;
  SELECT id INTO rid FROM public.routes WHERE is_public AND review_status='approved' AND status='active' LIMIT 1;
  SELECT id INTO prov FROM public.provinces WHERE code='gaza';
  INSERT INTO public.route_provinces(route_id, province_id, position) VALUES (rid, prov, 1);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.route_provinces WHERE route_id = rid;
  r := r || CASE WHEN n = 1 THEN 'PASS anon reads public route provinces; ' ELSE 'FAIL anon read '||n||'; ' END;
  BEGIN INSERT INTO public.route_provinces(route_id, province_id, position) VALUES (rid, prov, 2);
    r := r || 'CRITICAL anon wrote; '; EXCEPTION WHEN insufficient_privilege THEN r := r || 'PASS anon cannot write; '; END;
  RESET ROLE;
  -- 3. stops: travel stop needs a title, travel time only with a source, no proof on travel
  SELECT id INTO day FROM public.route_days WHERE route_id = rid LIMIT 1;
  BEGIN INSERT INTO public.route_stops(route_day_id, stop_order, stop_type, custom_title_pt, travel_minutes)
      VALUES (day, 99, 'travel', 'Deslocação teste', 120);
    r := r || 'FAIL travel time without source; '; EXCEPTION WHEN check_violation THEN r := r || 'PASS travel time needs source; '; END;
  INSERT INTO public.route_stops(route_day_id, stop_order, stop_type, custom_title_pt)
    VALUES (day, 98, 'travel', 'Deslocação teste (a confirmar)');
  r := r || 'PASS travel stop "a confirmar"; ';
  BEGIN INSERT INTO public.route_stops(route_day_id, stop_order, stop_type, custom_title_pt, validation_status, lat, lng)
      VALUES (day, 97, 'custom_stop', 'Local sem fonte', 'confirmed', -25, 33);
    r := r || 'FAIL confirmed custom place without source; '; EXCEPTION WHEN check_violation THEN r := r || 'PASS confirmed place needs source; '; END;
  BEGIN INSERT INTO public.route_stops(route_day_id, stop_order, stop_type, custom_title_pt, source_url)
      VALUES (day, 96, 'custom_stop', 'Fonte http', 'http://example.com');
    r := r || 'FAIL http source accepted; '; EXCEPTION WHEN check_violation THEN r := r || 'PASS https only; '; END;
  RAISE EXCEPTION 'TEST_BLOCO_A_ROLLBACK %', r;
END $$;
