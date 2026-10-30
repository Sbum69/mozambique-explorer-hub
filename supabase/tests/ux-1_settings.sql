-- =====================================================================================
-- UX-1 — Definições: notificações silenciadas, avatares e apagar a própria conta (0046)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * notificações: o turista silencia "community" (deixa de receber); reservas nunca se silenciam;
--     outro utilizador não mexe nas escolhas dele; deleted_at não é alterável pelo próprio.
--   * avatares: upload na própria pasta aceite; na pasta de outro recusado; anon recusado.
--   * apagar conta: anon não executa; sem confirmação recusa; último admin recusa; com reservas
--     futuras recusa; sem registos apaga tudo; com reservas passadas anonimiza (reserva sem nome,
--     papéis removidos, email libertado, login desligado).
-- Utilizadores escolhidos pelo papel e pelos dados que têm; sem emails.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0046.
-- Resultado esperado: erro TEST_UX1_ROLLBACK com [… PASS …] (ou SKIP quando não há dados para o
-- caso). Tudo é revertido.
-- Confirmar: SELECT count(*) FROM storage.objects WHERE bucket_id = 'avatars' AND name LIKE '%/ux1-test%'; -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  res text;
  -- Tourist with no business, no bookings and no admin role: the "hard delete" case.
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
                   AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                   AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.customer_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
  other uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist' AND ur.user_id <> tour
                  ORDER BY ur.user_id LIMIT 1);
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  -- Customer with only past (or closed) bookings and no business: the "anonymise" case.
  past_cust uuid := (SELECT b.customer_id FROM public.bookings b
                      WHERE NOT EXISTS (SELECT 1 FROM public.bookings f WHERE f.customer_id = b.customer_id
                                          AND f.date >= current_date AND f.status IN ('pending', 'confirmed'))
                        AND NOT EXISTS (SELECT 1 FROM public.businesses s WHERE s.owner_id = b.customer_id)
                        AND NOT public.has_role(b.customer_id, 'admin')
                      ORDER BY b.customer_id LIMIT 1);
  fut_owner uuid := (SELECT s.owner_id FROM public.bookings b JOIN public.businesses s ON s.id = b.business_id
                      WHERE b.date >= current_date AND b.status IN ('pending', 'confirmed')
                        AND NOT public.has_role(s.owner_id, 'admin')
                      ORDER BY s.owner_id LIMIT 1);
BEGIN
  -- ---------- Notifications ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.profiles SET muted_notification_types = ARRAY['community'] WHERE id = tour;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 1 THEN '[N-own-mute PASS] ' ELSE format('[N-own-mute FAIL %s] ', n) END;
  BEGIN
    UPDATE public.profiles SET muted_notification_types = ARRAY['booking'] WHERE id = tour;
    r := r || '[N-booking-locked FAIL accepted] ';
  EXCEPTION WHEN check_violation THEN r := r || '[N-booking-locked PASS refused] ';
  END;
  UPDATE public.profiles SET deleted_at = now() WHERE id = tour;
  SELECT count(*) INTO n FROM public.profiles WHERE id = tour AND deleted_at IS NOT NULL;
  r := r || CASE WHEN n = 0 THEN '[N-deleted_at-guard PASS] ' ELSE '[N-deleted_at-guard FAIL] ' END;
  UPDATE public.profiles SET muted_notification_types = ARRAY['route'] WHERE id = other;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[N-other-user PASS 0 rows] ' ELSE format('[N-other-user FAIL %s] ', n) END;
  RESET ROLE;
  INSERT INTO public.notifications (user_id, type, title_pt, body_pt) VALUES (tour, 'community', 'UX-1 teste', 'UX-1 silenciada');
  INSERT INTO public.notifications (user_id, type, title_pt, body_pt) VALUES (tour, 'booking', 'UX-1 teste', 'UX-1 reserva');
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND title_pt = 'UX-1 teste';
  r := r || CASE WHEN n = 1 THEN '[N-skip-muted PASS] ' ELSE format('[N-skip-muted FAIL %s] ', n) END;

  -- ---------- Avatars ----------
  SET LOCAL ROLE authenticated;
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('avatars', tour::text || '/ux1-test.webp', tour);
  r := r || '[A-own-folder PASS] ';
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('avatars', other::text || '/ux1-test.webp', tour);
    r := r || '[A-other-folder FAIL accepted] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[A-other-folder PASS denied] ';
  END;
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', tour::text || '/ux1-test-anon.webp');
    r := r || '[A-anon FAIL accepted] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[A-anon PASS denied] ';
  END;
  RESET ROLE;
  SELECT count(*) INTO n FROM storage.buckets WHERE id = 'avatars' AND public AND file_size_limit = 2097152
     AND NOT (allowed_mime_types @> ARRAY['image/svg+xml']);
  r := r || CASE WHEN n = 1 THEN '[A-bucket PASS] ' ELSE '[A-bucket FAIL] ' END;

  -- ---------- Delete account: refusals ----------
  r := r || CASE WHEN NOT has_function_privilege('anon', 'public.delete_my_account(text)', 'EXECUTE')
                 THEN '[D-anon PASS] ' ELSE '[D-anon FAIL] ' END;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.delete_my_account('sim');
    r := r || '[D-confirm FAIL accepted] ';
  EXCEPTION WHEN raise_exception THEN
    r := r || CASE WHEN SQLERRM = 'CONFIRMATION_REQUIRED' THEN '[D-confirm PASS] ' ELSE format('[D-confirm FAIL %s] ', SQLERRM) END;
  END;
  RESET ROLE;

  -- Last admin: leave only one admin (inside this rolled-back block) and try to delete it.
  DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> adm;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.delete_my_account('APAGAR');
    r := r || '[D-last-admin FAIL accepted] ';
  EXCEPTION WHEN raise_exception THEN
    r := r || CASE WHEN SQLERRM = 'LAST_ADMIN' THEN '[D-last-admin PASS] ' ELSE format('[D-last-admin FAIL %s] ', SQLERRM) END;
  END;
  RESET ROLE;

  IF fut_owner IS NULL THEN
    r := r || '[D-future-bookings SKIP no data] ';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', fut_owner, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.delete_my_account('DELETE');
      r := r || '[D-future-bookings FAIL accepted] ';
    EXCEPTION WHEN raise_exception THEN
      r := r || CASE WHEN SQLERRM IN ('BUSINESS_HAS_FUTURE_BOOKINGS', 'HAS_FUTURE_BOOKINGS') THEN '[D-future-bookings PASS] '
                     ELSE format('[D-future-bookings FAIL %s] ', SQLERRM) END;
    END;
    RESET ROLE;
  END IF;

  -- ---------- Delete account: hard delete ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := public.delete_my_account('APAGAR');
  RESET ROLE;
  SELECT count(*) INTO n FROM auth.users WHERE id = tour;
  r := r || CASE WHEN res = 'deleted' AND n = 0 AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = tour)
                 THEN '[D-hard PASS] ' ELSE format('[D-hard FAIL %s %s] ', res, n) END;

  -- ---------- Delete account: anonymise ----------
  IF past_cust IS NULL THEN
    r := r || '[D-anonymise SKIP no data] ';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', past_cust, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    res := public.delete_my_account('APAGAR');
    RESET ROLE;
    r := r || CASE WHEN res = 'anonymised'
                    AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE customer_id = past_cust
                                     AND (customer_name <> 'Conta apagada' OR customer_email IS NOT NULL OR customer_phone IS NOT NULL))
                    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = past_cust)
                    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = past_cust AND deleted_at IS NOT NULL AND display_name = 'Conta apagada')
                    AND EXISTS (SELECT 1 FROM auth.users WHERE id = past_cust AND email LIKE 'deleted-%@ekaya.invalid'
                                  AND banned_until = 'infinity' AND encrypted_password IS NULL)
                   THEN '[D-anonymise PASS] ' ELSE format('[D-anonymise FAIL %s] ', res) END;
  END IF;

  RAISE EXCEPTION 'TEST_UX1_ROLLBACK %', r;
END $$;
