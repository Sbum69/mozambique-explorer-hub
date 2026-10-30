-- =====================================================================================
-- 8E.5 — Fluxo comercial: expiração, não comparência e capacidade (migração 0037)
-- -------------------------------------------------------------------------------------
-- O que testa: expire_stale_bookings (só reservas pendentes passadas, notifica os dois lados), não comparência só pelo negócio e só depois do início, sem pontos, capacidade ao mudar pessoas.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro TEST_8E5_ROLLBACK com [… PASS …] em todos os itens. Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   TEST_8E5_ROLLBACK [EXP-past PASS] [EXP-future PASS intact] [expired rows=3] [EXP-notify
--   tourist=1 owner=1] [NS-owner-after PASS] [NS-no-points PASS] [NS-notify tourist=1]
--   [NS-owner-before PASS: BOOKING_NOT_YET_STARTED] [NS-tourist PASS: Only the business can mark a
--   confirmed booking as no-show] [NS-admin PASS: Only the business can mark a confirmed booking as
--   no-show] [CAP-over PASS: Capacity exceeded: 1 of 3 seats already booked for this slot]
--   [CAP-decrease PASS accepted]
-- Confirmar depois, por leitura: SELECT count(*) FROM experiences WHERE title_pt = 'SEG-8E5 test';  -- 0
-- =====================================================================================
DO $$
DECLARE
  admin_id uuid; owner_id uuid; biz uuid; cust uuid; exp uuid;
  d_future date; d_past date; d_cap date;
  e1 uuid; e2 uuid; n1 uuid; n2 uuid; n3 uuid; c1 uuid; c2 uuid;
  st text; rs text; n int; ledger_before int; ledger_after int; notif_cust int; notif_owner int;
  r text := '';
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT b.id, b.owner_id INTO biz, owner_id FROM public.businesses b WHERE b.status = 'approved' AND b.owner_id IS NOT NULL LIMIT 1;
  SELECT p.id INTO cust FROM public.profiles p WHERE p.id NOT IN (admin_id, owner_id) LIMIT 1;
  d_future := current_date + 7 + ((3 - extract(dow FROM current_date)::int + 7) % 7);  -- a Wednesday ahead
  d_past := d_future - 28;                                                             -- a past Wednesday
  d_cap := d_future + 7;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.experiences (business_id, title_pt, price_mzn, active, title_en, description_pt, description_en, capacity, destination_id, images)
    VALUES (biz, 'SEG-8E5 test', 100, false, 'QA test', 'Atividade de teste automático (revertida no fim).', 'Automatic test activity (rolled back at the end).', 20, (SELECT id FROM public.destinations WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY slug LIMIT 1), ARRAY['https://example.invalid/qa.jpg']) RETURNING id INTO exp;
  INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time, capacity, active, accepts_new_bookings)
    VALUES (exp, extract(dow FROM d_future)::int, '10:00', '12:00', 3, true, true);
  -- 0051: activate only once the activity is complete (schedule above, business contact here).
  UPDATE public.businesses SET contact = coalesce(contact, '{}'::jsonb) || '{"phone": "+258 000 000 000"}'::jsonb
   WHERE id = biz AND coalesce(contact ->> 'phone', '') = '' AND coalesce(contact ->> 'email', '') = ''
     AND coalesce(contact ->> 'whatsapp', '') = '';
  UPDATE public.experiences SET active = true WHERE id = exp;

  -- ===== Expiry =====
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, cust, d_future, '10:00', 1, 'SEG-8E5 test') RETURNING id INTO e1;
  UPDATE public.bookings SET date = d_past WHERE id = e1;  -- admin correction: now a past pending booking
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, cust, d_future, '10:00', 1, 'SEG-8E5 test') RETURNING id INTO e2;
  PERFORM set_config('request.jwt.claims', '', true);  -- scheduled job: no user session
  n := public.expire_stale_bookings();
  SELECT status::text, decision_reason INTO st, rs FROM public.bookings WHERE id = e1;
  r := r || CASE WHEN st = 'cancelled' AND rs = 'AUTO_EXPIRED' THEN '[EXP-past PASS] ' ELSE '[EXP-past FAIL ' || st || '/' || coalesce(rs,'-') || '] ' END;
  SELECT status::text INTO st FROM public.bookings WHERE id = e2;
  r := r || CASE WHEN st = 'pending' THEN '[EXP-future PASS intact] ' ELSE '[EXP-future FAIL ' || st || '] ' END;
  r := r || '[expired rows=' || n || '] ';
  SELECT count(*) INTO notif_cust FROM public.notifications WHERE user_id = cust AND title_en = 'Booking expired';
  SELECT count(*) INTO notif_owner FROM public.notifications WHERE user_id = owner_id AND title_en = 'Booking expired';
  r := r || '[EXP-notify tourist=' || notif_cust || ' owner=' || notif_owner || '] ';

  -- ===== No-show =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name, status)
    VALUES (exp, biz, cust, d_future, '10:00', 1, 'SEG-8E5 test', 'confirmed') RETURNING id INTO n1;
  UPDATE public.bookings SET date = d_past WHERE id = n1;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name, status)
    VALUES (exp, biz, cust, d_future, '10:00', 1, 'SEG-8E5 test', 'confirmed') RETURNING id INTO n2;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name, status)
    VALUES (exp, biz, cust, d_cap, '10:00', 1, 'SEG-8E5 test', 'confirmed') RETURNING id INTO n3;
  UPDATE public.bookings SET date = d_past - 7 WHERE id = n3;
  SELECT count(*) INTO ledger_before FROM public.points_ledger;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.business_decide_booking(n1, 'no_show');
    SELECT status::text INTO st FROM public.bookings WHERE id = n1;
    r := r || CASE WHEN st = 'no_show' THEN '[NS-owner-after PASS] ' ELSE '[NS-owner-after FAIL ' || st || '] ' END;
  EXCEPTION WHEN others THEN r := r || '[NS-owner-after FAIL: ' || SQLERRM || '] ';
  END;
  SELECT count(*) INTO ledger_after FROM public.points_ledger;
  r := r || CASE WHEN ledger_after = ledger_before THEN '[NS-no-points PASS] ' ELSE '[NS-no-points FAIL] ' END;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = cust AND title_en = 'Marked as no-show';
  r := r || '[NS-notify tourist=' || n || '] ';
  BEGIN
    PERFORM public.business_decide_booking(n2, 'no_show');
    r := r || '[NS-owner-before FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[NS-owner-before PASS: ' || SQLERRM || '] ';
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.bookings SET status = 'no_show' WHERE id = n3;
    r := r || '[NS-tourist FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[NS-tourist PASS: ' || SQLERRM || '] ';
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    UPDATE public.bookings SET status = 'no_show' WHERE id = n3;
    r := r || '[NS-admin FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[NS-admin PASS: ' || SQLERRM || '] ';
  END;

  -- ===== Admin capacity on people change (capacity 3) =====
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, cust, d_cap, '10:00', 2, 'SEG-8E5 test') RETURNING id INTO c1;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, cust, d_cap, '10:00', 1, 'SEG-8E5 test') RETURNING id INTO c2;
  BEGIN
    UPDATE public.bookings SET people = 3 WHERE id = c1;
    r := r || '[CAP-over FAIL: accepted] ';
  EXCEPTION WHEN others THEN r := r || '[CAP-over PASS: ' || SQLERRM || '] ';
  END;
  BEGIN
    UPDATE public.bookings SET people = 1 WHERE id = c1;
    r := r || '[CAP-decrease PASS accepted] ';
  EXCEPTION WHEN others THEN r := r || '[CAP-decrease FAIL: ' || SQLERRM || '] ';
  END;

  RAISE EXCEPTION 'TEST_8E5_ROLLBACK %', r;
END $$;
