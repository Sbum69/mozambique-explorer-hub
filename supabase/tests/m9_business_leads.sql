-- =====================================================================================
-- M9 — pedidos "Para negócios" (0055)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * o visitante (anon) envia um pedido só pela RPC; não lê nem escreve na tabela;
--   * honeypot preenchido = ignorado sem erro; limite de 3 pedidos por IP por dia;
--   * província/categoria inválidas recusadas; o admin é notificado;
--   * turista e dono não leem pedidos nem mudam estados; o admin muda o estado (auditado,
--     sem o hash do IP); lugares de Parceiro Fundador em falta são públicos.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0055.
-- Resultado esperado: erro TEST_M9_ROLLBACK com [… PASS …]. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM public.business_leads; -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := ''; n int; lid uuid;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
     ORDER BY ur.user_id LIMIT 1);
  prov uuid := (SELECT id FROM public.provinces WHERE active ORDER BY code LIMIT 1);
BEGIN
  PERFORM set_config('request.headers', '{"cf-connecting-ip":"203.0.113.9"}', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  PERFORM public.submit_business_lead('Teste M9 Lda', prov, 'restaurant', 'Pessoa Teste', '+258 84 000 0000', true, 'Olá', 'pt', 'http://spam');
  PERFORM public.submit_business_lead('Teste M9 Lda', prov, 'restaurant', 'Pessoa Teste', '+258 84 000 0000', true, 'Olá', 'pt', NULL);
  BEGIN PERFORM count(*) FROM public.business_leads; r := r || ' A-anon-read:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-read:PASS'; END;
  BEGIN INSERT INTO public.business_leads (business_name, province_id, category_code, contact_name, contact, accepts_bookings, ip_day_hash)
    VALUES ('x', prov, 'restaurant', 'x', 'xxxxxx', true, 'x'); r := r || ' A-anon-insert:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-insert:PASS'; END;
  BEGIN PERFORM public.submit_business_lead('Teste M9', prov, 'nope', 'Pessoa', '+258 84 000 0000', false, NULL, 'pt');
    r := r || ' A-bad-category:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM LIKE '%INVALID_CATEGORY%' THEN ' A-bad-category:PASS' ELSE ' A-bad-category:FAIL(' || SQLERRM || ')' END; END;
  PERFORM public.submit_business_lead('Teste M9 B', prov, 'shop', 'Pessoa', 'teste@example.org', false, NULL, 'en');
  PERFORM public.submit_business_lead('Teste M9 C', prov, 'shop', 'Pessoa', 'teste@example.org', false, NULL, 'en');
  BEGIN PERFORM public.submit_business_lead('Teste M9 D', prov, 'shop', 'Pessoa', 'teste@example.org', false, NULL, 'en');
    r := r || ' A-rate-limit:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'RATE_LIMITED' THEN ' A-rate-limit:PASS' ELSE ' A-rate-limit:FAIL(' || SQLERRM || ')' END; END;
  n := public.founder_places_left();
  r := r || CASE WHEN n >= 0 THEN ' A-founder-places-public:PASS' ELSE ' A-founder-places-public:FAIL' END;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.business_leads WHERE business_name LIKE 'Teste M9%';
  r := r || CASE WHEN n = 3 THEN ' B-stored-honeypot-ignored:PASS' ELSE ' B-stored-honeypot-ignored:FAIL(' || n || ')' END;
  SELECT count(*) INTO n FROM public.business_leads WHERE business_name LIKE 'Teste M9%' AND ip_day_hash ~ '^[0-9a-f]{64}$' AND ip_day_hash NOT LIKE '%203.0.113%';
  r := r || CASE WHEN n = 3 THEN ' B-ip-hashed:PASS' ELSE ' B-ip-hashed:FAIL' END;
  SELECT count(*) INTO n FROM public.notifications WHERE title_pt = 'Novo pedido em Para negócios';
  r := r || CASE WHEN n >= 3 THEN ' B-admin-notified:PASS' ELSE ' B-admin-notified:FAIL' END;
  SELECT id INTO lid FROM public.business_leads WHERE business_name = 'Teste M9 Lda';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.business_leads;
  r := r || CASE WHEN n = 0 THEN ' C-tourist-read:PASS' ELSE ' C-tourist-read:FAIL' END;
  BEGIN PERFORM public.admin_set_lead_status(lid, 'contacted'); r := r || ' C-tourist-status:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' C-tourist-status:PASS' ELSE ' C-tourist-status:FAIL(' || SQLERRM || ')' END; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.business_leads WHERE business_name LIKE 'Teste M9%';
  r := r || CASE WHEN n = 3 THEN ' D-admin-read:PASS' ELSE ' D-admin-read:FAIL' END;
  PERFORM public.admin_set_lead_status(lid, 'contacted', 'Liguei');
  SELECT count(*) INTO n FROM public.business_leads WHERE id = lid AND status = 'contacted' AND admin_note = 'Liguei';
  r := r || CASE WHEN n = 1 THEN ' D-status:PASS' ELSE ' D-status:FAIL' END;
  SELECT count(*) INTO n FROM public.admin_audit WHERE entity = 'business_leads' AND entity_id = lid::text AND NOT (after ? 'ip_day_hash');
  r := r || CASE WHEN n = 1 THEN ' D-audited-no-ip:PASS' ELSE ' D-audited-no-ip:FAIL' END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.business_leads;
  r := r || CASE WHEN n = 0 THEN ' D-admin-needs-2fa:PASS' ELSE ' D-admin-needs-2fa:FAIL' END;
  RESET ROLE;
  RAISE EXCEPTION 'TEST_M9_ROLLBACK %', r;
END $$;
