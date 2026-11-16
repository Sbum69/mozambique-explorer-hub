-- Run after 0060 in the SQL editor as a privileged test transaction.
-- The final ROUTE_POINTS_ROLLBACK exception intentionally rolls back every row.
-- Covers private route farming, deferred awards, approved public routes, the
-- 72-hour limit, and invalidation when an owner edits an approved route.
DO $$
DECLARE
  tourist uuid;
  administrator uuid;
  province uuid;
  private_route uuid;
  approved_route uuid;
  second_route uuid;
  edited_route uuid;
  progress uuid;
  stop_id uuid;
  proof_path text;
  earned int;
  review text;
  plan jsonb;
BEGIN
  SELECT ur.user_id INTO tourist FROM public.user_roles ur
  WHERE ur.role = 'tourist'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
  ORDER BY ur.user_id LIMIT 1;
  SELECT user_id INTO administrator FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO province FROM public.provinces WHERE active ORDER BY code LIMIT 1;
  IF tourist IS NULL OR administrator IS NULL OR province IS NULL THEN
    RAISE EXCEPTION 'ROUTE_POINTS_SKIP: tourist, admin, or province missing';
  END IF;

  -- Keep the test independent of this person's earlier completions; rollback restores them.
  UPDATE public.route_completion_history SET completed_at = now() - interval '73 hours'
  WHERE user_id = tourist;
  plan := jsonb_build_object(
    'title', 'SEG route rewards', 'provinceId', province, 'isPublic', false,
    'days', jsonb_build_array(jsonb_build_object(
      'title', 'Day 1', 'stops', jsonb_build_array(jsonb_build_object(
        'kind', 'custom', 'title', 'Test stop', 'lat', -25.9, 'lng', 32.5,
        'pendingValidation', false)))));

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  private_route := public.save_route_plan(NULL, plan, false);
  RESET ROLE;
  SELECT s.id INTO stop_id FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
  WHERE d.route_id = private_route;
  proof_path := tourist::text || '/seg-route-private-' || gen_random_uuid()::text || '.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('route-proofs', proof_path, tourist);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.route_progress (user_id, route_id)
  VALUES (tourist, private_route) RETURNING id INTO progress;
  PERFORM public.submit_stop_proof(progress, stop_id, proof_path, -25.9, 32.5, 10);
  SELECT count(*) INTO earned FROM public.points_ledger
  WHERE user_id = tourist AND source_type = 'route_stop' AND source_id = stop_id;
  IF earned <> 0 THEN RAISE EXCEPTION 'PRIVATE_STOP_PAID_EARLY'; END IF;
  UPDATE public.route_progress SET status = 'completed' WHERE id = progress;
  RESET ROLE;
  SELECT count(*) INTO earned FROM public.points_ledger
  WHERE user_id = tourist AND source_type = 'route' AND source_id = private_route;
  IF earned <> 0 THEN RAISE EXCEPTION 'PRIVATE_ROUTE_PAID'; END IF;

  UPDATE public.route_completion_history SET completed_at = now() - interval '73 hours'
  WHERE user_id = tourist;
  plan := jsonb_set(plan, '{isPublic}', 'true'::jsonb);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  approved_route := public.save_route_plan(NULL, plan, false);
  RESET ROLE;
  SELECT review_status INTO review FROM public.routes WHERE id = approved_route;
  IF review <> 'pending' THEN RAISE EXCEPTION 'USER_PUBLIC_ROUTE_NOT_PENDING'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', administrator, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.routes SET review_status = 'approved' WHERE id = approved_route;
  RESET ROLE;
  SELECT s.id INTO stop_id FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
  WHERE d.route_id = approved_route;
  proof_path := tourist::text || '/seg-route-approved-' || gen_random_uuid()::text || '.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('route-proofs', proof_path, tourist);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.route_progress (user_id, route_id)
  VALUES (tourist, approved_route) RETURNING id INTO progress;
  PERFORM public.submit_stop_proof(progress, stop_id, proof_path, -25.9, 32.5, 10);
  UPDATE public.route_progress SET status = 'completed' WHERE id = progress;
  RESET ROLE;
  SELECT coalesce(sum(points), 0) INTO earned FROM public.points_ledger
  WHERE user_id = tourist AND kind = 'award'
    AND ((source_type = 'route' AND source_id = approved_route)
      OR (source_type = 'route_stop' AND source_id = stop_id));
  IF earned <> 170 THEN RAISE EXCEPTION 'APPROVED_ROUTE_POINTS: %', earned; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  second_route := public.save_route_plan(NULL, plan, false);
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', administrator, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.routes SET review_status = 'approved' WHERE id = second_route;
  RESET ROLE;
  SELECT s.id INTO stop_id FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
  WHERE d.route_id = second_route;
  proof_path := tourist::text || '/seg-route-second-' || gen_random_uuid()::text || '.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('route-proofs', proof_path, tourist);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.route_progress (user_id, route_id)
  VALUES (tourist, second_route) RETURNING id INTO progress;
  PERFORM public.submit_stop_proof(progress, stop_id, proof_path, -25.9, 32.5, 10);
  BEGIN
    UPDATE public.route_progress SET status = 'completed' WHERE id = progress;
    RAISE EXCEPTION 'COOLDOWN_NOT_ENFORCED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'ROUTE_COOLDOWN_72H' THEN RAISE; END IF;
  END;
  RESET ROLE;
  UPDATE public.route_completion_history SET completed_at = now() - interval '73 hours'
  WHERE user_id = tourist;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.route_progress SET status = 'completed' WHERE id = progress;
  RESET ROLE;
  SELECT count(*) INTO earned FROM public.points_ledger
  WHERE user_id = tourist AND source_type = 'route' AND source_id = second_route;
  IF earned <> 1 THEN RAISE EXCEPTION 'POST_COOLDOWN_ROUTE_NOT_PAID'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  edited_route := public.save_route_plan(NULL, plan, false);
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', administrator, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.routes SET review_status = 'approved' WHERE id = edited_route;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.route_stops SET lat = -25.8 WHERE id IN (
    SELECT s.id FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
    WHERE d.route_id = edited_route);
  RESET ROLE;
  SELECT review_status INTO review FROM public.routes WHERE id = edited_route;
  IF review <> 'pending' THEN RAISE EXCEPTION 'EDIT_DID_NOT_REOPEN_REVIEW'; END IF;

  SELECT s.id INTO stop_id FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
  WHERE d.route_id = edited_route;
  proof_path := tourist::text || '/seg-route-edited-' || gen_random_uuid()::text || '.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('route-proofs', proof_path, tourist);
  UPDATE public.route_completion_history SET completed_at = now() - interval '73 hours'
  WHERE user_id = tourist;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.route_progress (user_id, route_id)
  VALUES (tourist, edited_route) RETURNING id INTO progress;
  PERFORM public.submit_stop_proof(progress, stop_id, proof_path, -25.8, 32.5, 10);
  UPDATE public.route_progress SET status = 'completed' WHERE id = progress;
  RESET ROLE;
  SELECT count(*) INTO earned FROM public.points_ledger
  WHERE user_id = tourist AND source_type = 'route' AND source_id = edited_route;
  IF earned <> 0 THEN RAISE EXCEPTION 'EDITED_ROUTE_PAID'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    DELETE FROM public.route_completion_history WHERE user_id = tourist;
    RAISE EXCEPTION 'HISTORY_WRITE_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  RAISE EXCEPTION 'ROUTE_POINTS_ROLLBACK [PRIVATE_NO_POINTS PASS] [APPROVED_170 PASS] [COOLDOWN PASS] [AFTER_72H PASS] [EDIT_REVIEW PASS] [EDITED_NO_POINTS PASS] [HISTORY_WRITE_DENIED PASS]';
END $$;
