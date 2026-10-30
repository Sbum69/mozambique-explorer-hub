-- =====================================================================================
-- LEGAL-1 — Aceitação dos Termos e da Política de Privacidade (0049)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * anon não executa accept_legal_documents;
--   * versão errada é recusada; a versão em vigor grava 2 linhas (source = prompt) e repetir não duplica;
--   * o utilizador não insere nem altera linhas diretamente; nem o servidor altera (só acrescentar);
--   * outro utilizador não vê as aceitações de ninguém além das suas;
--   * registo: conta nova com as versões em vigor nos metadados grava 2 linhas (source = signup);
--     com uma versão antiga não grava nada.
-- Utilizadores escolhidos pelo papel; as contas de registo são criadas e revertidas (emails .invalid).
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0049.
-- Resultado esperado: erro TEST_LEGAL1_ROLLBACK com [… PASS …]. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM auth.users WHERE email LIKE 'legal1-test-%'; -- 0
--            SELECT count(*) FROM public.legal_acceptances; -- igual ao valor antes do teste
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  v jsonb := public.current_legal_versions();
  tour uuid := (SELECT user_id FROM public.user_roles WHERE role = 'tourist' ORDER BY user_id LIMIT 1);
  other uuid := (SELECT user_id FROM public.user_roles WHERE role = 'tourist' AND user_id <> tour
                  ORDER BY user_id LIMIT 1);
  new_ok uuid := gen_random_uuid();
  new_old uuid := gen_random_uuid();
BEGIN
  -- ---------- anon ----------
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.accept_legal_documents(v ->> 'terms', v ->> 'privacy');
    r := r || ' A-anon-rpc:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-rpc:PASS';
  END;
  RESET ROLE;

  -- ---------- tourist ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.accept_legal_documents('2000-01-01', v ->> 'privacy');
    r := r || ' B-wrong-version:FAIL';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM = 'LEGAL_VERSION_MISMATCH' THEN ' B-wrong-version:PASS' ELSE ' B-wrong-version:FAIL(' || SQLERRM || ')' END;
  END;

  PERFORM public.accept_legal_documents(v ->> 'terms', v ->> 'privacy');
  PERFORM public.accept_legal_documents(v ->> 'terms', v ->> 'privacy');
  SELECT count(*) INTO n FROM public.legal_acceptances
   WHERE user_id = tour AND source = 'prompt'
     AND ((document = 'terms' AND version = v ->> 'terms') OR (document = 'privacy' AND version = v ->> 'privacy'));
  r := r || CASE WHEN n = 2 THEN ' C-accept-once:PASS' ELSE ' C-accept-once:FAIL(' || n || ')' END;

  BEGIN
    INSERT INTO public.legal_acceptances (user_id, document, version, source)
    VALUES (tour, 'terms', '2030-01-01', 'prompt');
    r := r || ' D-direct-insert:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' D-direct-insert:PASS';
  END;

  BEGIN
    UPDATE public.legal_acceptances SET accepted_at = now() - interval '1 year' WHERE user_id = tour;
    r := r || ' E-client-update:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' E-client-update:PASS';
  END;
  RESET ROLE;

  BEGIN
    UPDATE public.legal_acceptances SET accepted_at = now() - interval '1 year' WHERE user_id = tour;
    r := r || ' E-server-update:FAIL';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM = 'LEGAL_ACCEPTANCES_APPEND_ONLY' THEN ' E-server-update:PASS' ELSE ' E-server-update:FAIL(' || SQLERRM || ')' END;
  END;

  -- ---------- another user ----------
  IF other IS NULL THEN
    r := r || ' F-cross-read:SKIP(no second tourist)';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.legal_acceptances WHERE user_id = tour;
    r := r || CASE WHEN n = 0 THEN ' F-cross-read:PASS' ELSE ' F-cross-read:FAIL(' || n || ')' END;
    RESET ROLE;
  END IF;

  -- ---------- sign-up trigger ----------
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  VALUES (new_ok, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'legal1-test-ok@ekaya.invalid',
          jsonb_build_object('display_name', 'Teste', 'terms_version', v ->> 'terms', 'privacy_version', v ->> 'privacy'),
          now(), now()),
         (new_old, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'legal1-test-old@ekaya.invalid',
          jsonb_build_object('display_name', 'Teste', 'terms_version', '2000-01-01', 'privacy_version', v ->> 'privacy'),
          now(), now());
  SELECT count(*) INTO n FROM public.legal_acceptances WHERE user_id = new_ok AND source = 'signup';
  r := r || CASE WHEN n = 2 THEN ' G-signup-current:PASS' ELSE ' G-signup-current:FAIL(' || n || ')' END;
  SELECT count(*) INTO n FROM public.legal_acceptances WHERE user_id = new_old;
  r := r || CASE WHEN n = 0 THEN ' G-signup-old-version:PASS' ELSE ' G-signup-old-version:FAIL(' || n || ')' END;

  RAISE EXCEPTION 'TEST_LEGAL1_ROLLBACK [%]', r;
END $$;
