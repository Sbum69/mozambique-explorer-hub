-- =====================================================================================
-- SEG-2 (2FA) — os poderes de administrador exigem uma sessão aal2 (0050)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * sem sessão (jobs do servidor): has_role(admin, 'admin') continua verdadeiro;
--   * admin com sessão aal1 (só palavra-passe): has_role falso, admin_platform_summary recusado,
--     não vê negócios suspensos de outros;
--   * o mesmo admin com aal2 (palavra-passe + código): tudo volta a funcionar;
--   * outro utilizador a perguntar se alguém é admin: inalterado;
--   * outros papéis (turista) não dependem do aal.
-- Utilizadores escolhidos pelo papel; sem emails. Só leituras: nada a reverter, mas termina em erro
-- como os outros testes.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0050.
-- Resultado esperado: erro TEST_SEC2_ROLLBACK com [… PASS …].
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  ok boolean;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
                 AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                 ORDER BY ur.user_id LIMIT 1);
  suspended_others int := (SELECT count(*) FROM public.businesses
                            WHERE status = 'suspended' AND owner_id IS DISTINCT FROM adm);
BEGIN
  -- ---------- no session ----------
  PERFORM set_config('request.jwt.claims', '', true);
  r := r || CASE WHEN public.has_role(adm, 'admin') THEN ' A-no-session:PASS' ELSE ' A-no-session:FAIL' END;

  -- ---------- admin, aal1 ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  r := r || CASE WHEN NOT public.has_role(adm, 'admin') THEN ' B-aal1-has-role:PASS' ELSE ' B-aal1-has-role:FAIL' END;
  BEGIN
    PERFORM public.admin_platform_summary();
    r := r || ' B-aal1-admin-rpc:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || ' B-aal1-admin-rpc:PASS';
  END;
  SELECT count(*) INTO n FROM public.businesses WHERE status = 'suspended' AND owner_id IS DISTINCT FROM adm;
  r := r || CASE WHEN n = 0 THEN ' B-aal1-rls:PASS' ELSE ' B-aal1-rls:FAIL(' || n || ')' END;
  RESET ROLE;

  -- ---------- admin, no aal claim (old tokens) ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  r := r || CASE WHEN NOT public.has_role(adm, 'admin') THEN ' C-no-aal:PASS' ELSE ' C-no-aal:FAIL' END;
  RESET ROLE;

  -- ---------- admin, aal2 ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  r := r || CASE WHEN public.has_role(adm, 'admin') THEN ' D-aal2-has-role:PASS' ELSE ' D-aal2-has-role:FAIL' END;
  BEGIN
    PERFORM public.admin_platform_summary();
    r := r || ' D-aal2-admin-rpc:PASS';
  EXCEPTION WHEN OTHERS THEN r := r || ' D-aal2-admin-rpc:FAIL(' || SQLERRM || ')';
  END;
  SELECT count(*) INTO n FROM public.businesses WHERE status = 'suspended' AND owner_id IS DISTINCT FROM adm;
  r := r || CASE WHEN n = suspended_others THEN ' D-aal2-rls:PASS(' || n || ')' ELSE ' D-aal2-rls:FAIL(' || n || ')' END;
  RESET ROLE;

  -- ---------- another user ----------
  IF tour IS NULL THEN
    r := r || ' E-other-user:SKIP';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    SET LOCAL ROLE authenticated;
    ok := public.has_role(adm, 'admin');
    r := r || CASE WHEN ok THEN ' E-other-user-sees-admin:PASS' ELSE ' E-other-user-sees-admin:FAIL' END;
    r := r || CASE WHEN public.has_role(tour, 'tourist') THEN ' F-tourist-aal1:PASS' ELSE ' F-tourist-aal1:FAIL' END;
    RESET ROLE;
  END IF;

  RAISE EXCEPTION 'TEST_SEC2_ROLLBACK [%]', r;
END $$;
