-- =====================================================================================
-- 10B — Recompensas e provas localizadas (migração 0038)
-- -------------------------------------------------------------------------------------
-- O que testa: criação de recompensas (dono sim, turista não), resgate com pontos, provas de paragem com localização.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro TEST_10B_ROLLBACK com [… PASS …] em todos os itens. Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   TEST_10B_ROLLBACK [RW-owner-create PASS via RLS] [RW-tourist-create PASS: new row violates
--   row-level security policy for table "reward] [RD-insufficient PASS: insufficient_balance]
--   [PR-50m PASS verified, +20, d=50.0] [PR-2km PASS pending, no points] [PR-acc500 PASS not
--   verified] [PR-bypass PASS forced pending, coords dropped] [PR-nocoords PASS null] [coords
--   stored=0] [RD-ok+same-request PASS one debit] [RD-second-request PASS: out_of_stock]
--   [RD-balance-0 PASS: insufficient_balance] [VC-tourist PASS: voucher_not_found] [
-- Confirmar depois, por leitura: SELECT count(*) FROM rewards WHERE title_pt LIKE 'SEG-10B%';  -- 0
-- =====================================================================================
DO $$
DECLARE
  admin_id uuid; owner_id uuid; biz uuid; cust uuid;
  rA uuid := '11111111-1111-4111-8111-111111111111'; rB uuid := '2a6fa184-53d4-4ba4-b5f7-2065edf11560';
  pA uuid; pB uuid; sA uuid[]; sB uuid; tlat double precision; tlng double precision;
  res jsonb; rw1 uuid; rw2 uuid; req uuid := gen_random_uuid(); code1 text;
  led int; n int; st text; vb boolean; la numeric; r text := '';
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT b.id, b.owner_id INTO biz, owner_id FROM public.businesses b WHERE b.status = 'approved' AND b.owner_id IS NOT NULL LIMIT 1;
  SELECT p.id INTO cust FROM public.profiles p
   WHERE p.id NOT IN (admin_id, owner_id) AND NOT EXISTS (SELECT 1 FROM public.points_ledger l WHERE l.user_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.route_progress rp WHERE rp.user_id = p.id AND rp.route_id IN (rA, rB)) LIMIT 1;
  SELECT array_agg(s.id ORDER BY d.day_number, s.stop_order) INTO sA FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
   WHERE d.route_id = rA AND (SELECT c.lat FROM public.route_stop_coords(s.id) c) IS NOT NULL;
  SELECT s.id INTO sB FROM public.route_stops s JOIN public.route_days d ON d.id = s.route_day_id
   WHERE d.route_id = rB AND (SELECT c.lat FROM public.route_stop_coords(s.id) c) IS NULL LIMIT 1;
  INSERT INTO storage.objects (bucket_id, name, owner) SELECT 'route-proofs', cust::text || '/seg10b-' || g || '.jpg', cust FROM generate_series(1, 6) g;

  -- ===== Owner creates rewards (also through RLS as the authenticated role) =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'SEG-10B test 1', 20, 1) RETURNING id INTO rw1;
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'SEG-10B test 2', 20, 5) RETURNING id INTO rw2;
    RESET ROLE;
    r := r || '[RW-owner-create PASS via RLS] ';
  EXCEPTION WHEN others THEN
    RESET ROLE;
    r := r || '[RW-owner-create via RLS FAIL: ' || SQLERRM || '] ';
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'SEG-10B test 1', 20, 1) RETURNING id INTO rw1;
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'SEG-10B test 2', 20, 5) RETURNING id INTO rw2;
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rewards (business_id, title_pt, cost_points) VALUES (biz, 'SEG-10B test intruder', 5);
    RESET ROLE;
    r := r || '[RW-tourist-create FAIL: accepted] ';
  EXCEPTION WHEN others THEN RESET ROLE; r := r || '[RW-tourist-create PASS: ' || left(SQLERRM, 60) || '] ';
  END;

  -- ===== Tourist: no points yet =====
  BEGIN
    PERFORM public.redeem_reward(rw1, gen_random_uuid());
    r := r || '[RD-insufficient FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[RD-insufficient PASS: ' || SQLERRM || '] ';
  END;

  -- ===== Proofs =====
  INSERT INTO public.route_progress (user_id, route_id) VALUES (cust, rA) RETURNING id INTO pA;
  INSERT INTO public.route_progress (user_id, route_id) VALUES (cust, rB) RETURNING id INTO pB;
  SELECT c.lat, c.lng INTO tlat, tlng FROM public.route_stop_coords(sA[1]) c;
  res := public.submit_stop_proof(pA, sA[1], cust::text || '/seg10b-1.jpg', tlat + 50 / 111195.0, tlng, 20);
  SELECT count(*) INTO led FROM public.points_ledger WHERE user_id = cust;
  r := r || CASE WHEN res->>'review_status' = 'verified' AND led = 1 THEN '[PR-50m PASS verified, +20, d=' || (res->>'distance_m') || '] ' ELSE '[PR-50m FAIL ' || res::text || ' ledger=' || led || '] ' END;

  SELECT c.lat, c.lng INTO tlat, tlng FROM public.route_stop_coords(sA[2]) c;
  res := public.submit_stop_proof(pA, sA[2], cust::text || '/seg10b-2.jpg', tlat + 2000 / 111195.0, tlng, 20);
  SELECT count(*) INTO led FROM public.points_ledger WHERE user_id = cust;
  r := r || CASE WHEN res->>'review_status' = 'pending' AND (res->>'location_verified')::boolean = false AND led = 1 THEN '[PR-2km PASS pending, no points] ' ELSE '[PR-2km FAIL ' || res::text || '] ' END;

  SELECT c.lat, c.lng INTO tlat, tlng FROM public.route_stop_coords(sA[3]) c;
  res := public.submit_stop_proof(pA, sA[3], cust::text || '/seg10b-3.jpg', tlat, tlng, 500);
  SELECT count(*) INTO led FROM public.points_ledger WHERE user_id = cust;
  r := r || CASE WHEN res->>'review_status' = 'pending' AND (res->>'location_verified')::boolean = false AND led = 1 THEN '[PR-acc500 PASS not verified] ' ELSE '[PR-acc500 FAIL ' || res::text || '] ' END;

  -- Client bypass attempt: direct insert claiming verified, with coordinates.
  INSERT INTO public.route_stop_progress (progress_id, route_stop_id, photo_path, review_status, location_verified, lat, lng)
    VALUES (pA, sA[4], cust::text || '/seg10b-4.jpg', 'verified', true, -25.9, 32.5);
  SELECT review_status, location_verified, lat INTO st, vb, la FROM public.route_stop_progress WHERE progress_id = pA AND route_stop_id = sA[4];
  SELECT count(*) INTO led FROM public.points_ledger WHERE user_id = cust;
  r := r || CASE WHEN st = 'pending' AND vb IS NULL AND la IS NULL AND led = 1 THEN '[PR-bypass PASS forced pending, coords dropped] ' ELSE '[PR-bypass FAIL ' || st || '] ' END;

  res := public.submit_stop_proof(pB, sB, cust::text || '/seg10b-5.jpg', -25.96, 32.58, 10);
  r := r || CASE WHEN res->>'review_status' = 'pending' AND res->>'location_verified' IS NULL THEN '[PR-nocoords PASS null] ' ELSE '[PR-nocoords FAIL ' || res::text || '] ' END;
  SELECT count(*) INTO n FROM public.route_stop_progress sp JOIN public.route_progress p ON p.id = sp.progress_id WHERE p.user_id = cust AND (sp.lat IS NOT NULL OR sp.lng IS NOT NULL);
  r := r || '[coords stored=' || n || '] ';

  -- ===== Redemption with the 20 earned points =====
  res := public.redeem_reward(rw1, req);
  code1 := res->>'code';
  res := public.redeem_reward(rw1, req);
  SELECT count(*) INTO n FROM public.points_ledger WHERE user_id = cust AND kind = 'redemption';
  r := r || CASE WHEN (res->>'duplicate')::boolean AND res->>'code' = code1 AND n = 1 THEN '[RD-ok+same-request PASS one debit] ' ELSE '[RD-dup FAIL ' || res::text || ' debits=' || n || '] ' END;
  BEGIN
    PERFORM public.redeem_reward(rw1, gen_random_uuid());
    r := r || '[RD-second-request FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[RD-second-request PASS: ' || SQLERRM || '] ';
  END;
  BEGIN
    PERFORM public.redeem_reward(rw2, gen_random_uuid());
    r := r || '[RD-balance-0 FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[RD-balance-0 PASS: ' || SQLERRM || '] ';
  END;
  BEGIN
    PERFORM public.validate_voucher(code1);
    r := r || '[VC-tourist FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[VC-tourist PASS: ' || SQLERRM || '] ';
  END;

  -- ===== Owner validates the voucher; cannot redeem own reward =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  res := public.validate_voucher(lower(code1));
  r := r || '[VC-1 ' || (res->>'status') || '] ';
  res := public.validate_voucher(code1);
  r := r || '[VC-2 ' || (res->>'status') || '] ';
  BEGIN
    PERFORM public.redeem_reward(rw2, gen_random_uuid());
    r := r || '[RD-own FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[RD-own PASS: ' || SQLERRM || '] ';
  END;

  -- ===== Admin approves the stop without coordinates: points once =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  st := public.review_stop_proof(pB, sB, true);
  BEGIN
    PERFORM public.review_stop_proof(pB, sB, true);
    r := r || '[AP-twice FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[AP-twice PASS: ' || SQLERRM || '] ';
  END;
  SELECT count(*) INTO n FROM public.points_ledger WHERE user_id = cust AND source_type = 'route_stop' AND source_id = sB;
  r := r || CASE WHEN st = 'approved' AND n = 1 THEN '[AP-approve PASS +20 once] ' ELSE '[AP-approve FAIL ' || st || ' awards=' || n || '] ' END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.route_progress SET status = 'completed' WHERE id = pA;
    r := r || '[RC-incomplete FAIL: completed] ';
  EXCEPTION WHEN others THEN r := r || '[RC-pending-proofs PASS: ' || SQLERRM || '] ';
  END;

  RAISE EXCEPTION 'TEST_10B_ROLLBACK %', r;
END $$;
