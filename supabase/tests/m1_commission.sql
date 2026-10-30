-- =====================================================================================
-- M1 — motor de comissão (0053)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * arredondamento em centavos (meio para cima) e reconciliação bruto = comissão + taxa + líquido;
--   * nova versão da configuração só pelo admin, com motivo, e auditada; anon e turista recusados;
--   * Parceiro Fundador: comissão do Fundador; ao expirar volta à comissão normal; limite de Fundadores;
--   * snapshot criado com a reserva; o dono lê o seu, outro dono não; ninguém altera pelo browser;
--   * adulteração: turista não altera a configuração nem o snapshot; o snapshot não se altera nem
--     no servidor (só acrescentar).
-- Utilizadores escolhidos pelo papel; dados criados aqui e revertidos no fim.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0053.
-- Resultado esperado: erro TEST_M1_ROLLBACK com [… PASS …]. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM public.commercial_configs; -- 1 (a versão inicial)
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  q jsonb;
  s record;
  v int;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  biz uuid;
  own uuid;
  other_owner uuid;
  tour uuid;
  exp uuid;
  bk uuid;
  d date := current_date + 7 + ((3 - extract(dow FROM current_date)::int + 7) % 7);
BEGIN
  SELECT b.id, b.owner_id INTO biz, own FROM public.businesses b
   WHERE b.status = 'approved' AND b.owner_id IS NOT NULL ORDER BY b.name LIMIT 1;
  SELECT b.owner_id INTO other_owner FROM public.businesses b
   WHERE b.owner_id IS NOT NULL AND b.owner_id <> own LIMIT 1;
  SELECT ur.user_id INTO tour FROM public.user_roles ur WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
     AND NOT EXISTS (SELECT 1 FROM public.businesses x WHERE x.owner_id = ur.user_id)
   ORDER BY ur.user_id LIMIT 1;

  -- ---------- rounding ----------
  SELECT * INTO s FROM public.commission_split(250000, 1000, 0);
  r := r || CASE WHEN s.commission_cents = 25000 AND s.provider_fee_cents = 0 AND s.net_cents = 225000
                 THEN ' A-split-even:PASS' ELSE ' A-split-even:FAIL' END;
  SELECT * INTO s FROM public.commission_split(12345, 1000, 600);
  r := r || CASE WHEN s.commission_cents = 1235 AND s.provider_fee_cents = 741 AND s.net_cents = 10369
                 THEN ' A-split-half-up:PASS' ELSE ' A-split-half-up:FAIL(' || s::text || ')' END;
  SELECT * INTO s FROM public.commission_split(0, 1000, 600);
  r := r || CASE WHEN s.commission_cents = 0 AND s.net_cents = 0 THEN ' A-split-free:PASS' ELSE ' A-split-free:FAIL' END;

  -- ---------- new version (admin) ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_set_commercial_config(800, 0, 6, 20, 1, 0, 50000, 150000, 75000, '');
    r := r || ' B-reason-required:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'REASON_REQUIRED' THEN ' B-reason-required:PASS' ELSE ' B-reason-required:FAIL(' || SQLERRM || ')' END;
  END;
  v := public.admin_set_commercial_config(800, 0, 6, 20, 1, 0, 50000, 150000, 75000, 'Teste M1');
  r := r || CASE WHEN (public.current_commercial_config()).commission_bp = 800 AND (public.current_commercial_config()).version = v
                 THEN ' B-new-version:PASS' ELSE ' B-new-version:FAIL' END;
  SELECT count(*) INTO n FROM public.admin_audit WHERE action = 'commercial_config.set' AND entity_id = v::text AND reason = 'Teste M1';
  r := r || CASE WHEN n = 1 THEN ' B-audited:PASS' ELSE ' B-audited:FAIL' END;
  q := public.commission_quote(biz, 100000);
  r := r || CASE WHEN (q ->> 'commission_cents')::bigint = 8000 AND (q ->> 'deducted_cents')::bigint = 8000
                 THEN ' B-quote-new-rate:PASS' ELSE ' B-quote-new-rate:FAIL(' || q::text || ')' END;

  -- ---------- Founder ----------
  PERFORM public.admin_set_founder(biz, true, 'Teste M1');
  q := public.commission_quote(biz, 100000);
  r := r || CASE WHEN (q ->> 'founder')::boolean AND (q ->> 'commission_cents')::bigint = 0
                 THEN ' C-founder-rate:PASS' ELSE ' C-founder-rate:FAIL(' || q::text || ')' END;
  BEGIN
    PERFORM public.admin_set_founder(biz, true, 'Teste M1');
    r := r || ' C-already-founder:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'ALREADY_FOUNDER' THEN ' C-already-founder:PASS' ELSE ' C-already-founder:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;
  -- Founder period ends (server time travel inside the test).
  UPDATE public.business_commercial_terms SET founder_since = now() - interval '7 months', founder_until = now() - interval '1 day'
   WHERE business_id = biz;
  q := public.commission_quote(biz, 100000);
  r := r || CASE WHEN NOT (q ->> 'founder')::boolean AND (q ->> 'commission_cents')::bigint = 8000
                 THEN ' C-founder-expired:PASS' ELSE ' C-founder-expired:FAIL(' || q::text || ')' END;
  SET LOCAL ROLE authenticated;
  PERFORM public.admin_set_commercial_config(800, 0, 6, 1, 1, 0, 50000, 150000, 75000, 'Teste M1 limite');
  BEGIN
    PERFORM public.admin_set_founder((SELECT id FROM public.businesses WHERE id <> biz ORDER BY name LIMIT 1), true, 'Teste M1');
    r := r || ' C-founder-cap:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FOUNDER_CAP_REACHED' THEN ' C-founder-cap:PASS' ELSE ' C-founder-cap:FAIL(' || SQLERRM || ')' END;
  END;

  -- ---------- snapshot with a booking ----------
  INSERT INTO public.experiences (business_id, title_pt, title_en, description_pt, description_en, price_mzn, capacity,
                                  destination_id, images, active)
  VALUES (biz, 'M1 teste', 'M1 test', 'Atividade de teste automático (revertida no fim).', 'Automatic test activity (rolled back at the end).',
          1234.56, 10, (SELECT id FROM public.destinations WHERE lat IS NOT NULL ORDER BY slug LIMIT 1),
          ARRAY['https://example.invalid/qa.jpg'], false)
  RETURNING id INTO exp;
  INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time, capacity, active, accepts_new_bookings)
  VALUES (exp, extract(dow FROM d)::int, '10:00', '12:00', 10, true, true);
  RESET ROLE;
  UPDATE public.businesses SET contact = coalesce(contact, '{}'::jsonb) || '{"phone": "+258 000 000 000"}'::jsonb
   WHERE id = biz AND coalesce(contact ->> 'phone', '') = '' AND coalesce(contact ->> 'email', '') = ''
     AND coalesce(contact ->> 'whatsapp', '') = '';
  UPDATE public.experiences SET active = true WHERE id = exp;

  IF tour IS NULL THEN
    r := r || ' D-snapshot:SKIP(no tourist)';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.bookings (experience_id, business_id, customer_id, date, "time", people, customer_name, total_mzn, status, code)
    VALUES (exp, biz, tour, d, '10:00', 3, 'M1 teste', 1, 'pending', 'PENDING')
    RETURNING id INTO bk;
    -- price 1 234,56 × 3 = 3 703,68 MZN = 370 368 centavos; 8% → 29 629,44 → 29 629.
    BEGIN
      INSERT INTO public.booking_commission_snapshots (booking_id, business_id, config_version, founder, gross_cents, commission_bp,
        commission_cents, provider_fee_bp, provider_fee_cents, net_cents)
      VALUES (bk, biz, 1, false, 1, 0, 0, 0, 0, 1);
      r := r || ' E-tourist-insert-snapshot:FAIL';
    EXCEPTION WHEN insufficient_privilege THEN r := r || ' E-tourist-insert-snapshot:PASS';
    END;
    BEGIN
      UPDATE public.commercial_configs SET commission_bp = 0;
      r := r || ' E-tourist-update-config:FAIL';
    EXCEPTION WHEN insufficient_privilege THEN r := r || ' E-tourist-update-config:PASS';
    END;
    BEGIN
      PERFORM public.admin_set_commercial_config(0, 0, 6, 20, 1, 0, 0, 0, 0, 'tentativa');
      r := r || ' E-tourist-set-config:FAIL';
    EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' E-tourist-set-config:PASS' ELSE ' E-tourist-set-config:FAIL(' || SQLERRM || ')' END;
    END;
    RESET ROLE;
    SELECT * INTO s FROM public.booking_commission_snapshots WHERE booking_id = bk;
    r := r || CASE WHEN s.gross_cents = 370368 AND s.commission_bp = 800 AND s.commission_cents = 29629
                    AND s.net_cents = 370368 - 29629 - s.provider_fee_cents AND NOT s.founder
                   THEN ' D-snapshot:PASS' ELSE ' D-snapshot:FAIL(' || coalesce(s::text, 'none') || ')' END;
    BEGIN
      UPDATE public.booking_commission_snapshots SET commission_cents = 0 WHERE booking_id = bk;
      r := r || ' E-server-update-snapshot:FAIL';
    EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM LIKE 'APPEND_ONLY%' THEN ' E-server-update-snapshot:PASS' ELSE ' E-server-update-snapshot:FAIL(' || SQLERRM || ')' END;
    END;
    -- Owner reads it; another owner does not.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.booking_commission_snapshots WHERE booking_id = bk;
    r := r || CASE WHEN n = 1 THEN ' F-owner-reads:PASS' ELSE ' F-owner-reads:FAIL' END;
    RESET ROLE;
    IF other_owner IS NULL THEN
      r := r || ' F-other-owner:SKIP(no second owner)';
    ELSE
      PERFORM set_config('request.jwt.claims', json_build_object('sub', other_owner, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO n FROM public.booking_commission_snapshots WHERE booking_id = bk;
      r := r || CASE WHEN n = 0 THEN ' F-other-owner:PASS' ELSE ' F-other-owner:FAIL' END;
      RESET ROLE;
    END IF;
  END IF;

  -- ---------- anon ----------
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.commercial_configs;
  r := r || CASE WHEN n >= 1 THEN ' G-anon-reads-prices:PASS' ELSE ' G-anon-reads-prices:FAIL' END;
  BEGIN
    PERFORM public.admin_set_founder(biz, false, 'x');
    r := r || ' G-anon-founder:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' G-anon-founder:PASS';
  END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_M1_ROLLBACK [%]', r;
END $$;
