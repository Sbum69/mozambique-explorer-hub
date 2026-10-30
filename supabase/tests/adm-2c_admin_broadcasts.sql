-- =====================================================================================
-- ADM-2C — Avisos do admin (migração 0042)
-- -------------------------------------------------------------------------------------
-- O que testa: só o admin envia e lê o histórico; validações de título, texto e link interno; limite de 10 por hora; destinatários por público.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro TEST_ADM2C_ROLLBACK sem nenhum '…!' e com '11th refused'. Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   TEST_ADM2C_ROLLBACK expected: user=1 owners=6 all=21; non-admin send refused (FORBIDDEN);
--   non-admin history refused; table not readable; anon cannot execute; short title refused; long
--   body refused; external link refused; //link refused; unknown user refused; user -> 1; owners ->
--   6; all -> 21; all notifications linked=21; 11th refused (RATE_LIMITED); admin history rows=10,
--   sender=EKAYA Teste Admin
-- Confirmar depois, por leitura: SELECT count(*) FROM admin_broadcasts WHERE title_en = 'Test';  -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  res jsonb;
  n int;
  i int;
  adm  uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                   AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
  profiles_n int := (SELECT count(*) FROM public.profiles);
  owners_n int := (SELECT count(DISTINCT owner_id) FROM public.businesses WHERE owner_id IS NOT NULL);
BEGIN
  r := format('expected: user=1 owners=%s all=%s; ', owners_n, profiles_n);

  -- Non-admin refused
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.admin_send_notification('all', NULL, 'Ola', 'Hi', 'Texto', 'Text'); r := r || 'NON-ADMIN SENT!; ';
  EXCEPTION WHEN raise_exception THEN r := r || format('non-admin send refused (%s); ', SQLERRM); END;
  BEGIN PERFORM * FROM public.admin_list_broadcasts(); r := r || 'NON-ADMIN READ HISTORY!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'non-admin history refused; '; END;
  BEGIN PERFORM count(*) FROM public.admin_broadcasts; r := r || 'TABLE READABLE!; ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'table not readable; '; END;
  RESET ROLE;

  SET LOCAL ROLE anon;
  BEGIN PERFORM public.admin_send_notification('all', NULL, 'Ola', 'Hi', 'Texto', 'Text'); r := r || 'ANON SENT!; ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'anon cannot execute; '; END;
  RESET ROLE;

  -- Admin
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.admin_send_notification('all', NULL, 'A', 'Hi', 'Texto', 'Text'); r := r || 'SHORT TITLE SENT!; ';
  EXCEPTION WHEN check_violation THEN r := r || 'short title refused; '; END;
  BEGIN PERFORM public.admin_send_notification('all', NULL, 'Ola', 'Hi', repeat('x', 2001), 'Text'); r := r || 'LONG BODY SENT!; ';
  EXCEPTION WHEN check_violation THEN r := r || 'long body refused; '; END;
  BEGIN PERFORM public.admin_send_notification('all', NULL, 'Ola', 'Hi', 'Texto', 'Text', 'https://evil.example'); r := r || 'EXTERNAL LINK SENT!; ';
  EXCEPTION WHEN check_violation THEN r := r || 'external link refused; '; END;
  BEGIN PERFORM public.admin_send_notification('all', NULL, 'Ola', 'Hi', 'Texto', 'Text', '//evil.example'); r := r || 'PROTOCOL-RELATIVE SENT!; ';
  EXCEPTION WHEN check_violation THEN r := r || '//link refused; '; END;
  BEGIN PERFORM public.admin_send_notification('user', gen_random_uuid(), 'Ola', 'Hi', 'Texto', 'Text'); r := r || 'UNKNOWN USER SENT!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'unknown user refused; '; END;

  res := public.admin_send_notification('user', tour, 'Teste', 'Test', 'Aviso de teste', 'Test notice', '/home');
  r := r || format('user -> %s; ', res->>'recipients');
  res := public.admin_send_notification('business_owners', NULL, 'Teste', 'Test', 'Aviso de teste', 'Test notice');
  r := r || format('owners -> %s; ', res->>'recipients');
  res := public.admin_send_notification('all', NULL, 'Teste', 'Test', 'Aviso de teste', 'Test notice');
  r := r || format('all -> %s; ', res->>'recipients');
  SELECT count(*) INTO n FROM public.notifications WHERE broadcast_id = (res->>'broadcast_id')::uuid;
  r := r || format('all notifications linked=%s; ', n);

  FOR i IN 4..10 LOOP
    PERFORM public.admin_send_notification('user', tour, 'Teste', 'Test', 'Aviso de teste', 'Test notice');
  END LOOP;
  BEGIN PERFORM public.admin_send_notification('user', tour, 'Teste', 'Test', 'Aviso', 'Notice'); r := r || '11TH SENT!; ';
  EXCEPTION WHEN raise_exception THEN r := r || format('11th refused (%s); ', SQLERRM); END;

  SELECT count(*) INTO n FROM public.admin_list_broadcasts();
  r := r || format('admin history rows=%s, sender=%s', n, (SELECT sender FROM public.admin_list_broadcasts(1)));
  RESET ROLE;

  RAISE EXCEPTION 'TEST_ADM2C_ROLLBACK %', r;
END $$;
