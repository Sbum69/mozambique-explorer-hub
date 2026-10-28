-- =====================================================================================
-- TESTES-1 — Notificações: RLS, conteúdo imutável e triggers que as geram
-- -------------------------------------------------------------------------------------
-- O que testa (migrações 0011, 0017, 0018, 0026, 0028, 0037, 0039 e 0042):
--   * cada utilizador só lê as suas; não lê as de outro; o visitante não lê nada;
--   * pode marcar como lida, mas não alterar título/texto/link (trigger de conteúdo imutável);
--   * os triggers geram a notificação certa para: nova reserva (dono), confirmação, rejeição,
--     cancelamento pelo turista (dono), cancelamento pela administração (turista e dono),
--     conclusão, não comparência, expiração (turista e dono), decisão de negócio, de experiência
--     comunitária e de roteiro, e aviso do admin.
-- Utilizadores: escolhidos pelo papel (admin, dono de negócio aprovado, turista sem negócio,
--   um perfil sem negócio para o pedido de negócio); sem emails.
-- As notificações criadas pelo teste reconhecem-se por created_at = now() (instante da transação).
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: termina SEMPRE com o erro TEST_NOTIFICATIONS_ROLLBACK (tudo é revertido);
--   a mensagem lista [… PASS …] em todos os itens e nenhum [… FAIL …]. Os itens marcados
--   [… NOT RUN …] indicam que faltam dados de base para esse caso (não é falha).
-- Confirmar depois, por leitura, que não ficou nada:
--   SELECT count(*) FROM experiences WHERE title_pt = 'TESTES-1 notificações';     -- 0
--   SELECT count(*) FROM bookings WHERE customer_name = 'TESTES-1';                -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  st text;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  biz uuid;
  owner uuid;
  tour uuid;
  applicant uuid;
  exp uuid;
  d_future date := current_date + 7 + ((3 - extract(dow FROM current_date)::int + 7) % 7);
  d_past date;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid; b6 uuid;
  nb uuid;
  ce uuid;
  rt uuid;
  prov uuid := (SELECT id FROM public.provinces ORDER BY code LIMIT 1);
  mine_before int;
  res jsonb;
BEGIN
  d_past := d_future - 28;
  SELECT b.id, b.owner_id INTO biz, owner FROM public.businesses b
   WHERE b.status = 'approved' AND b.owner_id IS NOT NULL AND b.owner_id <> adm ORDER BY b.created_at LIMIT 1;
  SELECT ur.user_id INTO tour FROM public.user_roles ur
   WHERE ur.role = 'tourist' AND ur.user_id NOT IN (adm, coalesce(owner, adm))
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
   ORDER BY ur.user_id LIMIT 1;
  SELECT p.id INTO applicant FROM public.profiles p
   WHERE p.id NOT IN (adm, coalesce(owner, adm), tour)
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = p.id AND a.role = 'admin')
   ORDER BY p.id LIMIT 1;
  IF biz IS NULL OR tour IS NULL THEN
    RAISE EXCEPTION 'TEST_NOTIFICATIONS_ROLLBACK [SETUP FAIL business=% tourist=%]', biz, tour;
  END IF;

  -- Setup (admin): one experience with a weekly slot.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  INSERT INTO public.experiences (business_id, title_pt, title_en, price_mzn, active)
    VALUES (biz, 'TESTES-1 notificações', 'TESTES-1 notifications', 100, true) RETURNING id INTO exp;
  INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time, capacity, active, accepts_new_bookings)
    VALUES (exp, extract(dow FROM d_future)::int, '10:00', '12:00', 20, true, true);

  -- ---------- New booking -> owner ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, tour, d_future, '10:00', 1, 'TESTES-1') RETURNING id INTO b1;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, tour, d_future, '10:00', 1, 'TESTES-1') RETURNING id INTO b2;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, tour, d_future, '10:00', 1, 'TESTES-1') RETURNING id INTO b3;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, tour, d_future, '10:00', 1, 'TESTES-1') RETURNING id INTO b4;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, tour, d_future, '10:00', 1, 'TESTES-1') RETURNING id INTO b5;
  INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name)
    VALUES (exp, biz, tour, d_future, '10:00', 1, 'TESTES-1') RETURNING id INTO b6;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = owner AND created_at = now() AND title_en = 'New booking';
  r := r || CASE WHEN n = 6 THEN '[N-new-booking PASS owner=6] ' ELSE format('[N-new-booking FAIL owner=%s] ', n) END;

  -- ---------- Tourist cancels -> owner ----------
  PERFORM public.cancel_my_booking(b3);
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = owner AND created_at = now() AND title_en = 'Booking cancelled by customer';
  r := r || CASE WHEN n = 1 THEN '[N-cancel-tourist PASS owner] ' ELSE format('[N-cancel-tourist FAIL %s] ', n) END;

  -- ---------- Owner decides ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  PERFORM public.business_decide_booking(b1, 'confirmed');
  PERFORM public.business_decide_booking(b5, 'confirmed');
  BEGIN
    PERFORM public.business_decide_booking(b2, 'rejected', 'TESTES-1 sem vagas');
  EXCEPTION WHEN others THEN r := r || format('[N-reject setup FAIL %s] ', SQLERRM);
  END;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'Booking confirmed';
  r := r || CASE WHEN n = 2 THEN '[N-confirmed PASS] ' ELSE format('[N-confirmed FAIL %s] ', n) END;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'Booking rejected' AND body_en LIKE '%Reason: TESTES-1 sem vagas%';
  r := r || CASE WHEN n = 1 THEN '[N-rejected PASS with reason] ' ELSE format('[N-rejected FAIL %s] ', n) END;

  -- ---------- Administration cancels -> tourist + owner ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.bookings SET status = 'cancelled', decision_reason = 'TESTES-1 admin' WHERE id = b4;
    SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'Booking cancelled';
    r := r || CASE WHEN n = 1 THEN '[N-cancel-admin-tourist PASS] ' ELSE format('[N-cancel-admin-tourist FAIL %s] ', n) END;
    SELECT count(*) INTO n FROM public.notifications WHERE user_id = owner AND created_at = now() AND title_en = 'Booking cancelled by the administration';
    r := r || CASE WHEN n = 1 THEN '[N-cancel-admin-owner PASS] ' ELSE format('[N-cancel-admin-owner FAIL %s] ', n) END;
  EXCEPTION WHEN others THEN r := r || format('[N-cancel-admin FAIL %s] ', SQLERRM);
  END;

  -- Admin corrections: b1 and b5 already happened, b6 is a stale pending booking.
  UPDATE public.bookings SET date = d_past WHERE id IN (b1, b5, b6);

  -- ---------- Completed / no-show ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.business_decide_booking(b1, 'completed');
    SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'Activity completed';
    r := r || CASE WHEN n = 1 THEN '[N-completed PASS] ' ELSE format('[N-completed FAIL %s] ', n) END;
  EXCEPTION WHEN others THEN r := r || format('[N-completed FAIL %s] ', SQLERRM);
  END;
  BEGIN
    PERFORM public.business_decide_booking(b5, 'no_show');
    SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'Marked as no-show';
    r := r || CASE WHEN n = 1 THEN '[N-no-show PASS] ' ELSE format('[N-no-show FAIL %s] ', n) END;
  EXCEPTION WHEN others THEN r := r || format('[N-no-show FAIL %s] ', SQLERRM);
  END;

  -- ---------- Expiry (scheduled job, no session) -> tourist + owner ----------
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM public.expire_stale_bookings();
  SELECT count(*) INTO n FROM public.notifications WHERE created_at = now() AND title_en = 'Booking expired' AND user_id IN (tour, owner) AND body_en LIKE '%' || (SELECT code FROM public.bookings WHERE id = b6) || '%';
  r := r || CASE WHEN n = 2 THEN '[N-expired PASS tourist+owner] ' ELSE format('[N-expired FAIL %s] ', n) END;

  -- ---------- Business decision -> owner ----------
  IF applicant IS NULL THEN
    r := r || '[N-business NOT RUN: no profile without a business] ';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', '', true);
      INSERT INTO public.businesses (owner_id, name, slug, status) VALUES (applicant, 'TESTES-1 negócio', 'testes-1-negocio', 'pending') RETURNING id INTO nb;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
      UPDATE public.businesses SET status = 'approved' WHERE id = nb;
      UPDATE public.businesses SET status = 'suspended', rejection_reason = 'TESTES-1' WHERE id = nb;
      SELECT count(*) INTO n FROM public.notifications WHERE user_id = applicant AND created_at = now() AND title_en IN ('Business approved', 'Business suspended');
      r := r || CASE WHEN n = 2 THEN '[N-business PASS approved+suspended] ' ELSE format('[N-business FAIL %s] ', n) END;
    EXCEPTION WHEN others THEN r := r || format('[N-business FAIL %s] ', SQLERRM);
    END;
  END IF;

  -- ---------- Community experience decision -> author ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  INSERT INTO public.community_experiences (title_pt, title_en, description_pt, description_en, province_id, category)
    VALUES ('TESTES-1 proposta', 'TESTES-1 proposal', 'Descrição', 'Description', prov, 'food') RETURNING id INTO ce;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  UPDATE public.community_experiences SET status = 'rejected', rejection_reason = 'TESTES-1' WHERE id = ce;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'Experience rejected' AND body_en LIKE '%Reason: TESTES-1%';
  r := r || CASE WHEN n = 1 THEN '[N-community-exp PASS] ' ELSE format('[N-community-exp FAIL %s] ', n) END;

  -- ---------- Route decision -> owner ----------
  SELECT id INTO rt FROM public.routes WHERE owner_id IS NOT NULL AND owner_id <> adm ORDER BY created_at LIMIT 1;
  IF rt IS NULL THEN
    r := r || '[N-route NOT RUN: no user route] ';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', '', true);
      UPDATE public.routes SET review_status = 'pending' WHERE id = rt;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
      UPDATE public.routes SET review_status = 'rejected', rejection_reason = 'TESTES-1' WHERE id = rt;
      SELECT count(*) INTO n FROM public.notifications n2 JOIN public.routes x ON x.id = rt
       WHERE n2.user_id = x.owner_id AND n2.created_at = now() AND n2.title_en = 'Route rejected';
      r := r || CASE WHEN n = 1 THEN '[N-route PASS] ' ELSE format('[N-route FAIL %s] ', n) END;
    EXCEPTION WHEN others THEN r := r || format('[N-route FAIL %s] ', SQLERRM);
    END;
  END IF;

  -- ---------- Admin notice -> user ----------
  SET LOCAL ROLE authenticated;
  res := public.admin_send_notification('user', tour, 'TESTES-1 aviso', 'TESTES-1 notice', 'Texto de teste', 'Test text', '/home');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND created_at = now() AND title_en = 'TESTES-1 notice';
  r := r || CASE WHEN n = 1 THEN '[N-admin-notice PASS] ' ELSE format('[N-admin-notice FAIL %s] ', n) END;

  -- ---------- RLS ----------
  SELECT count(*) INTO mine_before FROM public.notifications WHERE user_id = tour;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.notifications;
  r := r || CASE WHEN n = mine_before THEN format('[L-own-only PASS %s] ', n) ELSE format('[L-own-only FAIL sees %s of %s] ', n, mine_before) END;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = owner;
  r := r || CASE WHEN n = 0 THEN '[L-other-user PASS 0] ' ELSE format('[L-other-user FAIL %s] ', n) END;
  UPDATE public.notifications SET read_at = now() WHERE user_id = tour AND created_at = now() AND title_en = 'TESTES-1 notice';
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 1 THEN '[L-mark-read PASS] ' ELSE format('[L-mark-read FAIL %s] ', n) END;
  BEGIN
    UPDATE public.notifications SET title_pt = 'Alterado' WHERE user_id = tour AND created_at = now() AND title_en = 'TESTES-1 notice';
    r := r || '[L-edit-content FAIL accepted] ';
  EXCEPTION WHEN raise_exception THEN r := r || '[L-edit-content PASS refused] ';
  END;
  UPDATE public.notifications SET read_at = now() WHERE user_id = owner;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[L-mark-other PASS 0 rows] ' ELSE format('[L-mark-other FAIL %s] ', n) END;
  BEGIN
    INSERT INTO public.notifications (user_id, title_pt, body_pt) VALUES (tour, 'Falso', 'Falso aviso');
    r := r || '[L-insert FAIL accepted] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[L-insert PASS denied] ';
  END;
  RESET ROLE;

  SET LOCAL ROLE anon;
  -- anon may hold the default SELECT grant, but no policy lets it see any notification.
  BEGIN
    SELECT count(*) INTO n FROM public.notifications;
    r := r || CASE WHEN n = 0 THEN '[L-anon PASS 0 rows] ' ELSE format('[L-anon FAIL reads %s] ', n) END;
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[L-anon PASS denied] ';
  END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_NOTIFICATIONS_ROLLBACK %', r;
END $$;
