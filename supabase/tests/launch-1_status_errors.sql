-- =====================================================================================
-- LAUNCH-1 — estado do lançamento e registo de erros (0057)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * admin_launch_status: só o admin com 2FA; contas internas fora das contagens;
--   * log_app_error: anon e sessão escrevem só pela RPC, sem dados pessoais (email, números, ids
--     mascarados; caminho sem query string); só o admin lê; apagado ao fim de 30 dias.
-- Como correr: colar no SQL da Lovable Cloud, DEPOIS da 0057. Resultado: TEST_LAUNCH1_ROLLBACK.
-- =====================================================================================
DO $$
DECLARE
  r text := ''; n int; j jsonb; t record;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
     ORDER BY ur.user_id LIMIT 1);
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  PERFORM public.log_app_error('client', '/experience/0b0f4a8e-1111-4c4c-9d9d-123456789abc?x=ana@example.org',
    'TypeError for ana@example.org at 84 123 4567 id 0b0f4a8e-1111-4c4c-9d9d-123456789abc', '0.9.0');
  BEGIN PERFORM count(*) FROM public.app_errors; r := r || ' A-anon-read:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-read:PASS'; END;
  BEGIN PERFORM public.admin_launch_status(); r := r || ' A-anon-status:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-status:PASS'; END;
  RESET ROLE;
  SELECT * INTO t FROM public.app_errors ORDER BY created_at DESC LIMIT 1;
  r := r || CASE WHEN t.route = '/experience/$id' AND t.message NOT LIKE '%ana@%' AND t.message LIKE '%[email]%'
                  AND t.message LIKE '%[número]%' AND t.message LIKE '%[id]%'
                 THEN ' B-no-personal-data:PASS' ELSE ' B-no-personal-data:FAIL(' || t.route || ' ' || t.message || ')' END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.app_errors;
  r := r || CASE WHEN n = 0 THEN ' C-tourist-read:PASS' ELSE ' C-tourist-read:FAIL' END;
  BEGIN PERFORM public.admin_launch_status(); r := r || ' C-tourist-status:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' C-tourist-status:PASS' ELSE ' C-tourist-status:FAIL(' || SQLERRM || ')' END; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.admin_launch_status(); r := r || ' D-admin-needs-2fa:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' D-admin-needs-2fa:PASS' ELSE ' D-admin-needs-2fa:FAIL(' || SQLERRM || ')' END; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  j := public.admin_launch_status();
  r := r || CASE WHEN (j ->> 'min_businesses')::int = 5 AND (j ->> 'approved_businesses') IS NOT NULL
                  AND jsonb_typeof(j -> 'businesses') = 'array' AND (j ->> 'errors_7d')::int >= 1
                 THEN ' D-status:PASS' ELSE ' D-status:FAIL' END;
  r := r || CASE WHEN NOT EXISTS (SELECT 1 FROM jsonb_array_elements(j -> 'businesses') x WHERE x ->> 'name' = 'EKAYA Teste — não reservar')
                 THEN ' D-internal-excluded:PASS' ELSE ' D-internal-excluded:FAIL' END;
  SELECT count(*) INTO n FROM public.app_errors;
  r := r || CASE WHEN n >= 1 THEN ' D-admin-reads:PASS' ELSE ' D-admin-reads:FAIL' END;
  RESET ROLE;
  UPDATE public.app_errors SET created_at = now() - interval '31 days';
  PERFORM public.app_errors_purge();
  SELECT count(*) INTO n FROM public.app_errors;
  r := r || CASE WHEN n = 0 THEN ' E-purge:PASS' ELSE ' E-purge:FAIL' END;
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'ekaya-app-errors-purge';
  r := r || CASE WHEN n = 1 THEN ' E-cron:PASS' ELSE ' E-cron:FAIL' END;
  RAISE EXCEPTION 'TEST_LAUNCH1_ROLLBACK %', r;
END $$;
