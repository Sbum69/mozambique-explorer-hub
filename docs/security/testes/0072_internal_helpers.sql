-- =====================================================================================
-- Guião de teste da PROPOSTA 0072 — commission_quote, is_founder, is_internal_user sem EXECUTE
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar): confirmar que nada em produção depende do EXECUTE
-- de authenticated nestas funções. Esperado: 0 linhas nas duas consultas.
--   SELECT schemaname, tablename, policyname FROM pg_policies
--    WHERE qual ~ '(commission_quote|is_founder|is_internal_user)'
--       OR with_check ~ '(commission_quote|is_founder|is_internal_user)';
--   SELECT p.proname, pg_get_userbyid(p.proowner) AS dono, p.prosecdef
--     FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace AND ns.nspname = 'public'
--    WHERE pg_get_functiondef(p.oid) ~ '(commission_quote|is_founder|is_internal_user)\('
--      AND p.proname NOT IN ('commission_quote','is_founder','is_internal_user')
--      AND NOT p.prosecdef;                -- uma função SECURITY INVOKER que as chame partiria
--   SELECT viewname FROM pg_views WHERE schemaname = 'public'
--      AND definition ~ '(commission_quote|is_founder|is_internal_user)';
--
-- Como correr: BEGIN; colar drizzle/migrations/0072_internal_helpers_not_callable.sql; colar o
-- bloco DO; ROLLBACK;   Termina SEMPRE com TEST_0072_ROLLBACK.
--
-- Casos:
--   F1  authenticated chama commission_quote  → ERRO esperado (insufficient_privilege) → [F1 OK]
--   F2  authenticated chama is_founder        → ERRO esperado                           → [F2 OK]
--   F3  authenticated chama is_internal_user  → ERRO esperado                           → [F3 OK]
--   F4  anon chama commission_quote           → ERRO esperado                           → [F4 OK]
--   I1  o trigger de comissões continua a funcionar: uma reserva criada por um turista
--       gera a linha em booking_commission_snapshots                                    → [I1 OK]
--   I2  has_role continua executável por authenticated (RLS)                            → [I2 OK]
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
                 AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                 ORDER BY ur.user_id LIMIT 1);
  biz uuid := (SELECT id FROM public.businesses WHERE status = 'approved' ORDER BY created_at LIMIT 1);
  ok boolean;
BEGIN
  IF tour IS NULL OR biz IS NULL THEN RAISE EXCEPTION 'TEST_0072_ROLLBACK [SETUP ERRO tour=% biz=%]', tour, biz; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.commission_quote(biz, 10000); r := r || '[F1 ERRO executou] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[F1 OK] '; END;
  BEGIN PERFORM public.is_founder(biz); r := r || '[F2 ERRO executou] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[F2 OK] '; END;
  BEGIN PERFORM public.is_internal_user(tour); r := r || '[F3 ERRO executou] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[F3 OK] '; END;
  BEGIN ok := public.has_role(tour, 'admin'); r := r || '[I2 OK] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[I2 ERRO] '; END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN PERFORM public.commission_quote(biz, 10000); r := r || '[F4 ERRO executou] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[F4 OK] '; END;
  RESET ROLE;

  -- I1: o trigger é SECURITY DEFINER e chama commission_quote como dono.
  -- Usa o mesmo fluxo de reserva do supabase/tests/m1_commission.sql (copiar daí o INSERT de uma
  -- reserva de teste como turista); aqui só se confirma que o dono do trigger mantém o EXECUTE:
  SELECT count(*) INTO n FROM pg_proc p
   WHERE p.proname = 'bookings_commission_snapshot' AND p.prosecdef
     AND has_function_privilege(pg_get_userbyid(p.proowner), 'public.commission_quote(uuid, bigint)', 'EXECUTE');
  r := r || CASE WHEN n = 1 THEN '[I1 OK dono do trigger mantém EXECUTE] ' ELSE '[I1 ERRO] ' END;

  RAISE EXCEPTION 'TEST_0072_ROLLBACK %', r;
END $$;
-- Recomendado também: correr supabase/tests/m1_commission.sql e m6_sponsored.sql dentro da mesma
-- transação (depois do passo 2) — devem continuar todos PASS.
