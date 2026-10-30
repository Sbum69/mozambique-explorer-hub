-- =====================================================================================
-- SEG-2 — Integridade das reservas (migração 0035)
-- -------------------------------------------------------------------------------------
-- O que testa: disponibilidade obrigatória, horário dentro do slot, capacidade, transições de estado do admin.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro SEG2_TEST_ROLLBACK com [… PASS …] em todos os itens. Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   SEG2_TEST_ROLLBACK [P21a PASS: No availability configured for requested start time] [P21b PASS:
--   Capacity exceeded: 2 of 2 seats already booked for this slot] [P20a PASS: Booking is in a final
--   state] [P20b PASS: REASON_REQUIRED] [P20c PASS: Only the business can confirm a pending
--   booking] [P20d PASS: cancelled with reason]
-- Confirmar depois, por leitura: SELECT count(*) FROM experiences WHERE title_pt LIKE 'SEG-2%';  -- 0
-- =====================================================================================
DO $$
DECLARE
  admin_id uuid; biz uuid; exp uuid; d date; p_id uuid; done_id uuid; st text; r text := '';
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO biz FROM public.businesses
   WHERE status = 'approved' AND (owner_id IS NULL OR owner_id <> admin_id) LIMIT 1;
  d := current_date + 7 + ((3 - extract(dow FROM current_date)::int + 7) % 7);  -- a Wednesday, 1–2 weeks ahead
  -- Act as admin for this transaction only.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);

  INSERT INTO public.experiences (business_id, title_pt, price_mzn, active, title_en, description_pt, description_en, capacity, destination_id, images)
    VALUES (biz, 'SEG-2 test', 100, false, 'QA test', 'Atividade de teste automático (revertida no fim).', 'Automatic test activity (rolled back at the end).', 20, (SELECT id FROM public.destinations WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY slug LIMIT 1), ARRAY['https://example.invalid/qa.jpg']) RETURNING id INTO exp;
  INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time, capacity, active, accepts_new_bookings)
    VALUES (exp, extract(dow FROM d)::int, '10:00', '12:00', 2, true, true);
  -- 0051: activate only once the activity is complete (schedule above, business contact here).
  UPDATE public.businesses SET contact = coalesce(contact, '{}'::jsonb) || '{"phone": "+258 000 000 000"}'::jsonb
   WHERE id = biz AND coalesce(contact ->> 'phone', '') = '' AND coalesce(contact ->> 'email', '') = ''
     AND coalesce(contact ->> 'whatsapp', '') = '';
  UPDATE public.experiences SET active = true WHERE id = exp;

  -- P21a: time inside the slot but not its start.
  BEGIN
    INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
      VALUES (exp, biz, admin_id, d, '10:30', 1, 'SEG-2 test');
    r := r || '[P21a FAIL: 10:30 accepted] ';
  EXCEPTION WHEN others THEN r := r || '[P21a PASS: ' || SQLERRM || '] ';
  END;

  -- P21b: 2 people fill the slot, a third person must be rejected.
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, admin_id, d, '10:00', 2, 'SEG-2 test') RETURNING id INTO p_id;
  BEGIN
    INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
      VALUES (exp, biz, admin_id, d, '10:00', 1, 'SEG-2 test');
    r := r || '[P21b FAIL: over capacity accepted] ';
  EXCEPTION WHEN others THEN r := r || '[P21b PASS: ' || SQLERRM || '] ';
  END;

  -- P20a: admin tries to reopen a completed booking.
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name, status)
    VALUES (exp, biz, admin_id, d + 7, '10:00', 1, 'SEG-2 test', 'completed') RETURNING id INTO done_id;
  BEGIN
    UPDATE public.bookings SET status = 'pending' WHERE id = done_id;
    r := r || '[P20a FAIL: completed reopened] ';
  EXCEPTION WHEN others THEN r := r || '[P20a PASS: ' || SQLERRM || '] ';
  END;

  -- P20b: admin cancels a pending booking without a reason.
  BEGIN
    UPDATE public.bookings SET status = 'cancelled', decision_reason = NULL WHERE id = p_id;
    r := r || '[P20b FAIL: cancelled without reason] ';
  EXCEPTION WHEN others THEN r := r || '[P20b PASS: ' || SQLERRM || '] ';
  END;

  -- P20c: admin (not the owner) tries to confirm a pending booking.
  BEGIN
    UPDATE public.bookings SET status = 'confirmed' WHERE id = p_id;
    r := r || '[P20c FAIL: admin confirmed] ';
  EXCEPTION WHEN others THEN r := r || '[P20c PASS: ' || SQLERRM || '] ';
  END;

  -- P20d: admin cancels a pending booking with a reason (allowed).
  BEGIN
    UPDATE public.bookings SET status = 'cancelled', decision_reason = 'SEG-2 test reason' WHERE id = p_id;
    SELECT status::text INTO st FROM public.bookings WHERE id = p_id;
    r := r || CASE WHEN st = 'cancelled' THEN '[P20d PASS: cancelled with reason] ' ELSE '[P20d FAIL: status ' || st || '] ' END;
  EXCEPTION WHEN others THEN r := r || '[P20d FAIL: ' || SQLERRM || '] ';
  END;

  RAISE EXCEPTION 'SEG2_TEST_ROLLBACK %', r;
END $$;
