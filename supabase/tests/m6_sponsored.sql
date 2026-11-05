-- =====================================================================================
-- M6 — destaques e campanhas com pagamento manual (0054)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * o dono pede um destaque; o preço vem da configuração comercial (não do browser);
--   * ninguém escreve na tabela pelo browser (preço, estado, datas); anon não lê nem pede;
--   * outro dono não vê nem cancela; o dono não decide; só o admin aprova e marca como pago;
--   * pago com início hoje fica ativo; limite de lugares por âmbito; limite por página;
--   * expiração automática (sponsored_placements_tick); expirado sai da lista pública;
--   * Parceiro Fundador: o primeiro destaque é grátis (e só o primeiro);
--   * cancelamento pelo dono só antes de pago; motivos obrigatórios; auditoria e notificações;
--   * instruções de pagamento: só o admin muda; versões só se acrescentam.
-- Utilizadores escolhidos pelo papel; dados criados aqui e revertidos no fim.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0054.
-- Resultado esperado: erro TEST_M6_ROLLBACK com [… PASS …]. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM public.sponsored_placements; -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  j jsonb;
  p1 uuid;
  p2 uuid;
  p3 uuid;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  biz uuid;
  own uuid;
  other_biz uuid;
  other_owner uuid;
  tour uuid;
  today date := (now() AT TIME ZONE 'Africa/Maputo')::date;
  cfg public.commercial_configs := public.current_commercial_config();
BEGIN
  SELECT b.id, b.owner_id INTO biz, own FROM public.businesses b
   WHERE b.status = 'approved' AND b.owner_id IS NOT NULL ORDER BY b.name LIMIT 1;
  SELECT b.id, b.owner_id INTO other_biz, other_owner FROM public.businesses b
   WHERE b.status = 'approved' AND b.owner_id IS NOT NULL AND b.owner_id <> own ORDER BY b.name LIMIT 1;
  SELECT ur.user_id INTO tour FROM public.user_roles ur WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
     AND NOT EXISTS (SELECT 1 FROM public.businesses x WHERE x.owner_id = ur.user_id)
   ORDER BY ur.user_id LIMIT 1;
  IF other_owner IS NULL THEN RAISE EXCEPTION 'TEST_M6_SETUP: need two approved businesses with owners'; END IF;

  -- ---------- anon ----------
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM public.sponsored_placements;
    r := r || ' A-anon-read:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-read:PASS';
  END;
  BEGIN
    PERFORM public.request_sponsored_placement(biz, 'highlight', NULL, 'home', NULL, NULL, 'week', today, NULL, NULL, NULL, NULL, NULL);
    r := r || ' A-anon-request:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-request:PASS';
  END;
  SELECT count(*) INTO n FROM public.active_sponsored('home');
  r := r || CASE WHEN n = 0 THEN ' A-anon-public-empty:PASS' ELSE ' A-anon-public-empty:FAIL' END;
  RESET ROLE;

  -- ---------- owner requests ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.request_sponsored_placement(biz, 'highlight', NULL, 'home', NULL, NULL, 'week', today - 1, NULL, NULL, NULL, NULL, NULL);
    r := r || ' B-past-start:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'INVALID_START' THEN ' B-past-start:PASS' ELSE ' B-past-start:FAIL(' || SQLERRM || ')' END;
  END;
  BEGIN
    PERFORM public.request_sponsored_placement(other_biz, 'highlight', NULL, 'home', NULL, NULL, 'week', today, NULL, NULL, NULL, NULL, NULL);
    r := r || ' B-other-business:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' B-other-business:PASS' ELSE ' B-other-business:FAIL(' || SQLERRM || ')' END;
  END;
  j := public.request_sponsored_placement(biz, 'highlight', NULL, 'home', NULL, NULL, 'week', today, NULL, NULL, NULL, NULL, NULL);
  p1 := (j->>'id')::uuid;
  r := r || CASE WHEN j->>'status' = 'requested' AND (j->>'price_cents')::bigint = cfg.highlight_week_cents
                  AND j->>'reference' ~ '^EKD-[0-9A-F]{8}$' AND (j->>'ends_on')::date = today + 7
                 THEN ' B-request-price-from-config:PASS' ELSE ' B-request-price-from-config:FAIL(' || j::text || ')' END;
  j := public.request_sponsored_placement(biz, 'campaign', 'dish', 'home', NULL, NULL, 'month', today, NULL,
         'Matapa da casa', 'House matapa', 'Só esta semana', 'This week only');
  p2 := (j->>'id')::uuid;
  r := r || CASE WHEN (j->>'price_cents')::bigint = cfg.highlight_month_cents AND j->>'kind' = 'campaign'
                 THEN ' B-campaign-month:PASS' ELSE ' B-campaign-month:FAIL' END;
  BEGIN
    UPDATE public.sponsored_placements SET price_cents = 1 WHERE id = p1;
    r := r || ' B-browser-price:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' B-browser-price:PASS';
  END;
  BEGIN
    INSERT INTO public.sponsored_placements (reference, business_id, kind, scope, duration, starts_on, ends_on, price_cents, config_version, status)
    VALUES ('EKD-X', biz, 'highlight', 'home', 'week', today, today + 7, 0, 1, 'active');
    r := r || ' B-browser-insert:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' B-browser-insert:PASS';
  END;
  BEGIN
    PERFORM public.admin_decide_placement(p1, 'approve');
    r := r || ' B-owner-approve:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' B-owner-approve:PASS' ELSE ' B-owner-approve:FAIL(' || SQLERRM || ')' END;
  END;
  SELECT count(*) INTO n FROM public.sponsored_placements WHERE business_id = biz;
  r := r || CASE WHEN n = 2 THEN ' B-owner-reads-own:PASS' ELSE ' B-owner-reads-own:FAIL(' || n || ')' END;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications n2
   WHERE n2.title_pt = 'Novo pedido de destaque' AND n2.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');
  r := r || CASE WHEN n >= 2 THEN ' B-admins-notified:PASS' ELSE ' B-admins-notified:FAIL' END;

  -- ---------- other owner ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other_owner, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.sponsored_placements WHERE business_id = biz;
  r := r || CASE WHEN n = 0 THEN ' C-cross-read:PASS' ELSE ' C-cross-read:FAIL' END;
  BEGIN
    PERFORM public.cancel_my_placement(p1, 'x');
    r := r || ' C-cross-cancel:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' C-cross-cancel:PASS' ELSE ' C-cross-cancel:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;

  -- ---------- tourist ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_decide_placement(p1, 'paid', NULL, 'x');
    r := r || ' D-tourist-paid:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' D-tourist-paid:PASS' ELSE ' D-tourist-paid:FAIL(' || SQLERRM || ')' END;
  END;
  BEGIN
    PERFORM public.admin_set_manual_payment('+258 84 000 0000', 'Teste', 'Instruções de teste', 'Test instructions', 'x');
    r := r || ' D-tourist-payment-config:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' D-tourist-payment-config:PASS' ELSE ' D-tourist-payment-config:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;

  -- ---------- admin (aal2) ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  n := public.admin_set_manual_payment('+258 84 000 0000', 'EKAYA Teste', 'Envie o valor por M-Pesa com a referência.', 'Send the amount by M-Pesa with the reference.', 'Teste M6');
  r := r || CASE WHEN n IS NOT NULL THEN ' E-payment-config:PASS' ELSE ' E-payment-config:FAIL' END;
  j := public.admin_decide_placement(p1, 'approve');
  r := r || CASE WHEN j->>'status' = 'awaiting_payment' THEN ' E-approve:PASS' ELSE ' E-approve:FAIL(' || (j->>'status') || ')' END;
  BEGIN
    PERFORM public.admin_decide_placement(p1, 'paid', NULL, '');
    r := r || ' E-paid-note-required:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'PAYMENT_NOTE_REQUIRED' THEN ' E-paid-note-required:PASS' ELSE ' E-paid-note-required:FAIL(' || SQLERRM || ')' END;
  END;
  j := public.admin_decide_placement(p1, 'paid', NULL, 'M-Pesa ABC123');
  r := r || CASE WHEN j->>'status' = 'active' AND j->>'paid_at' IS NOT NULL THEN ' E-paid-activates:PASS' ELSE ' E-paid-activates:FAIL(' || (j->>'status') || ')' END;
  PERFORM public.admin_decide_placement(p2, 'approve');
  PERFORM public.admin_decide_placement(p2, 'paid', NULL, 'M-Pesa DEF456');
  BEGIN
    PERFORM public.admin_decide_placement(p2, 'reject', 'tarde');
    r := r || ' E-reject-after-paid:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'INVALID_TRANSITION' THEN ' E-reject-after-paid:PASS' ELSE ' E-reject-after-paid:FAIL(' || SQLERRM || ')' END;
  END;
  SELECT count(*) INTO n FROM public.admin_audit WHERE entity = 'sponsored_placements' AND entity_id IN (p1::text, p2::text);
  r := r || CASE WHEN n = 4 THEN ' E-audited:PASS' ELSE ' E-audited:FAIL(' || n || ')' END;

  -- per-page limit
  SELECT count(*) INTO n FROM public.active_sponsored('home');
  r := r || CASE WHEN n = LEAST(2, cfg.sponsored_per_page) THEN ' F-public-two:PASS' ELSE ' F-public-two:FAIL(' || n || ')' END;
  PERFORM public.admin_set_sponsored_limits(2, 1, 'Teste M6');
  SELECT count(*) INTO n FROM public.active_sponsored('home');
  r := r || CASE WHEN n = 1 THEN ' F-per-page-limit:PASS' ELSE ' F-per-page-limit:FAIL(' || n || ')' END;
  SELECT count(*) INTO n FROM public.active_sponsored('province', (SELECT id FROM public.provinces LIMIT 1));
  r := r || CASE WHEN n = 0 THEN ' F-scope-separate:PASS' ELSE ' F-scope-separate:FAIL' END;
  -- slots per scope (2 taken, limit 2)
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  p3 := (public.request_sponsored_placement(biz, 'highlight', NULL, 'home', NULL, NULL, 'week', today + 1, NULL, NULL, NULL, NULL, NULL)->>'id')::uuid;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_decide_placement(p3, 'approve');
    r := r || ' F-slots:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'NO_SLOTS' THEN ' F-slots:PASS' ELSE ' F-slots:FAIL(' || SQLERRM || ')' END;
  END;
  BEGIN
    PERFORM public.admin_decide_placement(p3, 'reject', '');
    r := r || ' F-reject-reason:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'REASON_REQUIRED' THEN ' F-reject-reason:PASS' ELSE ' F-reject-reason:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;

  -- ---------- owner cancels ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.cancel_my_placement(p3, 'Mudei de ideias');
  SELECT count(*) INTO n FROM public.sponsored_placements WHERE id = p3 AND status = 'cancelled';
  r := r || CASE WHEN n = 1 THEN ' G-owner-cancel:PASS' ELSE ' G-owner-cancel:FAIL' END;
  BEGIN
    PERFORM public.cancel_my_placement(p1, 'tarde');
    r := r || ' G-cancel-active:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'INVALID_TRANSITION' THEN ' G-cancel-active:PASS' ELSE ' G-cancel-active:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;

  -- ---------- expiry (simulate time passing) ----------
  UPDATE public.sponsored_placements SET starts_on = today - 7, ends_on = today WHERE id = p1;
  n := public.sponsored_placements_tick();
  SELECT count(*) INTO n FROM public.sponsored_placements WHERE id = p1 AND status = 'expired';
  r := r || CASE WHEN n = 1 THEN ' H-expires:PASS' ELSE ' H-expires:FAIL' END;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.active_sponsored('home') a WHERE a.id = p1;
  r := r || CASE WHEN n = 0 THEN ' H-expired-hidden:PASS' ELSE ' H-expired-hidden:FAIL' END;
  RESET ROLE;
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'ekaya-sponsored-tick';
  r := r || CASE WHEN n = 1 THEN ' H-cron:PASS' ELSE ' H-cron:FAIL' END;

  -- ---------- Founding Partner: first one free ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.admin_set_founder(other_biz, true, 'Teste M6');
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other_owner, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  j := public.request_sponsored_placement(other_biz, 'highlight', NULL, 'category', NULL, 'restaurant', 'week', today + 3, NULL, NULL, NULL, NULL, NULL);
  p3 := (j->>'id')::uuid;
  r := r || CASE WHEN (j->>'free')::boolean AND (j->>'price_cents')::bigint = 0 THEN ' I-founder-free:PASS' ELSE ' I-founder-free:FAIL' END;
  j := public.request_sponsored_placement(other_biz, 'highlight', NULL, 'category', NULL, 'restaurant', 'week', today + 3, NULL, NULL, NULL, NULL, NULL);
  r := r || CASE WHEN NOT (j->>'free')::boolean AND (j->>'price_cents')::bigint = cfg.highlight_week_cents
                 THEN ' I-founder-second-paid:PASS' ELSE ' I-founder-second-paid:FAIL' END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  j := public.admin_decide_placement(p3, 'approve');
  r := r || CASE WHEN j->>'status' = 'paid' THEN ' I-free-skips-payment:PASS' ELSE ' I-free-skips-payment:FAIL(' || (j->>'status') || ')' END;
  RESET ROLE;
  SELECT free_highlights_used INTO n FROM public.business_commercial_terms WHERE business_id = other_biz;
  r := r || CASE WHEN n = 1 THEN ' I-free-used:PASS' ELSE ' I-free-used:FAIL' END;

  -- ---------- append-only payment instructions ----------
  BEGIN
    UPDATE public.manual_payment_configs SET account_name = 'x';
    r := r || ' J-append-only:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM LIKE 'APPEND_ONLY%' THEN ' J-append-only:PASS' ELSE ' J-append-only:FAIL(' || SQLERRM || ')' END;
  END;

  RAISE EXCEPTION 'TEST_M6_ROLLBACK %', r;
END $$;
