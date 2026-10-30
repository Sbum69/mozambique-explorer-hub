-- =====================================================================================
-- DADOS-2 — Contas internas fora das métricas (0047)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * o próprio não altera is_internal (nem pela coluna, nem por admin_set_internal);
--   * o admin marca/desmarca com admin_set_internal;
--   * platform_impact_stats e admin_platform_summary deixam de contar uma conta marcada como interna;
--   * admin_platform_summary só para admin; anon não executa as funções.
-- Utilizadores escolhidos pelo papel; sem emails.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0047.
-- Resultado esperado: erro TEST_DADOS2_ROLLBACK com [… PASS …] em todos os itens. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM profiles WHERE is_internal;  -- igual ao valor antes do teste
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  before_accounts int;
  after_accounts int;
  tour_before boolean;
  adm uuid := (SELECT ur.user_id FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
                WHERE ur.role = 'admin' AND NOT p.is_internal AND p.deleted_at IS NULL ORDER BY ur.user_id LIMIT 1);
  -- A real (not internal, not deleted) account to mark during the test.
  target uuid := (SELECT p.id FROM public.profiles p
                   WHERE NOT p.is_internal AND p.deleted_at IS NULL AND p.id <> adm ORDER BY p.id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                 ORDER BY ur.user_id LIMIT 1);
BEGIN
  -- ---------- Own flag cannot be changed ----------
  tour_before := (SELECT is_internal FROM public.profiles WHERE id = tour);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.profiles SET is_internal = NOT is_internal WHERE id = tour;
  RESET ROLE;
  r := r || CASE WHEN (SELECT is_internal FROM public.profiles WHERE id = tour) = tour_before
                 THEN '[I-self-column PASS guarded] ' ELSE '[I-self-column FAIL changed] ' END;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_set_internal(tour, true);
    r := r || '[I-self-rpc FAIL accepted] ';
  EXCEPTION WHEN raise_exception THEN
    r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN '[I-self-rpc PASS forbidden] ' ELSE format('[I-self-rpc FAIL %s] ', SQLERRM) END;
  END;
  BEGIN
    PERFORM public.admin_platform_summary();
    r := r || '[S-tourist FAIL accepted] ';
  EXCEPTION WHEN raise_exception THEN
    r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN '[S-tourist PASS forbidden] ' ELSE format('[S-tourist FAIL %s] ', SQLERRM) END;
  END;
  RESET ROLE;

  -- ---------- anon ----------
  r := r || CASE WHEN NOT has_function_privilege('anon', 'public.admin_set_internal(uuid, boolean)', 'EXECUTE')
                  AND NOT has_function_privilege('anon', 'public.admin_platform_summary()', 'EXECUTE')
                  AND NOT has_function_privilege('anon', 'public.is_internal_user(uuid)', 'EXECUTE')
                 THEN '[A-anon PASS] ' ELSE '[A-anon FAIL] ' END;

  -- ---------- Metrics leave the marked account out ----------
  before_accounts := (public.platform_impact_stats() -> 'platform' ->> 'accounts')::int;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.admin_set_internal(target, true);
  RESET ROLE;
  after_accounts := (public.platform_impact_stats() -> 'platform' ->> 'accounts')::int;
  r := r || CASE WHEN after_accounts = before_accounts - 1 THEN format('[M-impact PASS %s→%s] ', before_accounts, after_accounts)
                 ELSE format('[M-impact FAIL %s→%s] ', before_accounts, after_accounts) END;
  SET LOCAL ROLE authenticated;
  SELECT (public.admin_platform_summary() ->> 'profiles')::int INTO n;
  RESET ROLE;
  r := r || CASE WHEN n = after_accounts THEN '[M-admin-summary PASS] ' ELSE format('[M-admin-summary FAIL %s] ', n) END;
  SELECT count(*) INTO n FROM public.profiles WHERE id = target AND is_internal;
  r := r || CASE WHEN n = 1 THEN '[I-admin-rpc PASS] ' ELSE '[I-admin-rpc FAIL] ' END;

  RAISE EXCEPTION 'TEST_DADOS2_ROLLBACK %', r;
END $$;
