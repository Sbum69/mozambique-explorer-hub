-- =====================================================================================
-- ADM-1 — Gestão de utilizadores e negócios pelo admin (migração 0039)
-- -------------------------------------------------------------------------------------
-- O que testa: suspender/reativar negócios, papéis (não remover o último admin nem o próprio), atribuir dono, notificações.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro TEST_ADM1_ROLLBACK com [… PASS …] em todos os itens. Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   TEST_ADM1_ROLLBACK [NA-suspend PASS FORBIDDEN] [NA-role PASS FORBIDDEN] [NA-assign PASS
--   FORBIDDEN] [NA-cancel PASS 0 rows] [NA-activity PASS 0 rows] [SUS-noreason PASS
--   REASON_REQUIRED] [visible-before=1] [SUS suspended open_bookings=1] [SUS-hidden PASS]
--   [SUS-existing-booking pending] [SUS-new-booking PASS Activity not active or business not
--   approved] [REACT PASS visible again] [owner notified suspend+reactivate=2] [ROLE-grant
--   business_small] [ROLE-revoke tourist] [ROLE-own-admin PASS CANNOT_REVOKE_OWN_ADMIN] [ROLE-owner
-- Confirmar depois, por leitura: SELECT count(*) FROM experiences WHERE title_pt = 'ADM-1 test';  -- 0
-- =====================================================================================
DO $$
DECLARE
  admin_id uuid; other_admin uuid; own_uid uuid; biz uuid; cust uuid; cust2 uuid; unconfirmed uuid; unconfirmed_email text; cust_email text;
  ownerless uuid; exp uuid; bk uuid; d date; res jsonb; roles text[]; n int; st text; vis int; notif1 int; r text := '';
  owner_email text;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1;
  SELECT user_id INTO other_admin FROM public.user_roles WHERE role = 'admin' AND user_id <> admin_id LIMIT 1;
  SELECT b.id, b.owner_id INTO biz, own_uid FROM public.businesses b WHERE b.status = 'approved' AND b.owner_id IS NOT NULL LIMIT 1;
  SELECT email INTO owner_email FROM auth.users WHERE id = own_uid;
  SELECT p.id, u.email INTO cust, cust_email FROM public.profiles p JOIN auth.users u ON u.id = p.id
   WHERE u.email_confirmed_at IS NOT NULL AND NOT public.has_role(p.id, 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.businesses x WHERE x.owner_id = p.id) ORDER BY p.created_at LIMIT 1;
  SELECT p.id INTO cust2 FROM public.profiles p WHERE p.id NOT IN (admin_id, coalesce(other_admin, admin_id), own_uid, cust)
     AND NOT public.has_role(p.id, 'admin') AND NOT EXISTS (SELECT 1 FROM public.businesses x WHERE x.owner_id = p.id) LIMIT 1;
  SELECT u.id, u.email INTO unconfirmed, unconfirmed_email FROM auth.users u JOIN public.profiles p ON p.id = u.id
   WHERE u.email_confirmed_at IS NULL LIMIT 1;
  SELECT b.id INTO ownerless FROM public.businesses b WHERE b.status = 'approved' AND b.owner_id IS NULL ORDER BY b.name LIMIT 1;
  d := current_date + 7 + ((3 - extract(dow FROM current_date)::int + 7) % 7);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  INSERT INTO public.experiences (business_id, title_pt, price_mzn, active) VALUES (biz, 'ADM-1 test', 100, true) RETURNING id INTO exp;
  INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time, capacity, active, accepts_new_bookings)
    VALUES (exp, extract(dow FROM d)::int, '10:00', '12:00', 5, true, true);
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, cust, d, '10:00', 1, 'ADM-1 test') RETURNING id INTO bk;

  -- ===== Non-admin is refused =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust2, 'role', 'authenticated')::text, true);
  BEGIN PERFORM public.admin_set_business_status(biz, 'suspended', 'teste'); r := r || '[NA-suspend FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[NA-suspend PASS ' || SQLERRM || '] '; END;
  BEGIN PERFORM public.admin_set_user_role(cust2, 'admin', true); r := r || '[NA-role FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[NA-role PASS ' || SQLERRM || '] '; END;
  BEGIN PERFORM public.admin_assign_business_owner(ownerless, cust_email); r := r || '[NA-assign FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[NA-assign PASS ' || SQLERRM || '] '; END;
  SET LOCAL ROLE authenticated;
  UPDATE public.bookings SET status = 'cancelled', decision_reason = 'teste' WHERE id = bk; GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[NA-cancel PASS 0 rows] ' ELSE '[NA-cancel FAIL] ' END;
  UPDATE public.experiences SET active = false WHERE id = exp; GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[NA-activity PASS 0 rows] ' ELSE '[NA-activity FAIL] ' END;
  RESET ROLE;

  -- ===== Suspend / reactivate =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  BEGIN PERFORM public.admin_set_business_status(biz, 'suspended', ''); r := r || '[SUS-noreason FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[SUS-noreason PASS ' || SQLERRM || '] '; END;
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon; SELECT count(*) INTO vis FROM public.experiences WHERE id = exp; RESET ROLE;
  r := r || '[visible-before=' || vis || '] ';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  res := public.admin_set_business_status(biz, 'suspended', 'Teste de suspensão');
  r := r || '[SUS ' || (res->>'status') || ' open_bookings=' || (res->>'open_bookings') || '] ';
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO vis FROM public.experiences WHERE id = exp;
  SELECT count(*) INTO n FROM public.businesses WHERE id = biz;
  RESET ROLE;
  r := r || CASE WHEN vis = 0 AND n = 0 THEN '[SUS-hidden PASS] ' ELSE '[SUS-hidden FAIL exp=' || vis || ' biz=' || n || '] ' END;
  SELECT status::text INTO st FROM public.bookings WHERE id = bk;
  r := r || '[SUS-existing-booking ' || st || '] ';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
      VALUES (exp, biz, cust, d, '10:00', 1, 'ADM-1 test');
    r := r || '[SUS-new-booking FAIL accepted] ';
  EXCEPTION WHEN others THEN r := r || '[SUS-new-booking PASS ' || SQLERRM || '] ';
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  res := public.admin_set_business_status(biz, 'approved');
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon; SELECT count(*) INTO vis FROM public.experiences WHERE id = exp; RESET ROLE;
  SELECT count(*) INTO notif1 FROM public.notifications WHERE user_id = own_uid AND title_en IN ('Business suspended', 'Business reactivated');
  r := r || CASE WHEN res->>'status' = 'approved' AND vis = 1 THEN '[REACT PASS visible again] ' ELSE '[REACT FAIL vis=' || vis || '] ' END;
  r := r || '[owner notified suspend+reactivate=' || notif1 || '] ';

  -- ===== Roles =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  roles := public.admin_set_user_role(cust2, 'business_small', true);
  r := r || '[ROLE-grant ' || array_to_string(roles, '+') || '] ';
  roles := public.admin_set_user_role(cust2, 'business_small', false);
  r := r || '[ROLE-revoke ' || array_to_string(roles, '+') || '] ';
  BEGIN PERFORM public.admin_set_user_role(admin_id, 'admin', false); r := r || '[ROLE-own-admin FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[ROLE-own-admin PASS ' || SQLERRM || '] '; END;
  BEGIN PERFORM public.admin_set_user_role(own_uid, 'business_small', false); r := r || '[ROLE-owner FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[ROLE-owner PASS ' || SQLERRM || '] '; END;
  IF other_admin IS NOT NULL THEN
    roles := public.admin_set_user_role(other_admin, 'admin', false);
    r := r || '[ROLE-revoke-other-admin -> ' || coalesce(array_to_string(roles, '+'), '-') || '] ';
  END IF;

  -- ===== Assign owner =====
  BEGIN PERFORM public.admin_assign_business_owner(ownerless, unconfirmed_email); r := r || '[AS-unconfirmed FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[AS-unconfirmed PASS ' || SQLERRM || '] '; END;
  BEGIN PERFORM public.admin_assign_business_owner(ownerless, owner_email); r := r || '[AS-has-business FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[AS-has-business PASS ' || SQLERRM || '] '; END;
  res := public.admin_assign_business_owner(ownerless, upper(cust_email));
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = cust AND title_en = 'Business assigned';
  r := r || CASE WHEN (SELECT b.owner_id FROM public.businesses b WHERE b.id = ownerless) = cust AND public.has_role(cust, 'business_small')
                  AND NOT public.has_role(cust, 'tourist') AND n = 1
             THEN '[AS-ok PASS owner+role+notified] ' ELSE '[AS-ok FAIL ' || res::text || '] ' END;
  BEGIN PERFORM public.admin_assign_business_owner(ownerless, cust_email); r := r || '[AS-already-owned FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[AS-already-owned PASS ' || SQLERRM || '] '; END;

  -- ===== Admin booking cancel and activity toggle through RLS + guard =====
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.bookings SET status = 'cancelled', decision_reason = NULL WHERE id = bk;
    r := r || '[ADM-cancel-noreason FAIL] ';
  EXCEPTION WHEN others THEN r := r || '[ADM-cancel-noreason PASS ' || SQLERRM || '] ';
  END;
  UPDATE public.bookings SET status = 'cancelled', decision_reason = 'Teste do admin' WHERE id = bk; GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 1 THEN '[ADM-cancel PASS] ' ELSE '[ADM-cancel FAIL] ' END;
  UPDATE public.experiences SET active = false WHERE id = exp; GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 1 THEN '[ADM-activity PASS] ' ELSE '[ADM-activity FAIL] ' END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_ADM1_ROLLBACK %', r;
END $$;
