-- =====================================================================================
-- Guião de teste da PROPOSTA 0077 — versões legais 2026-11-23 (contacto apoio@exploreekaya.com)
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar):
--   SELECT public.current_legal_versions();                -- esperado: 2026-11-07 / 2026-11-07
--   SELECT document, version, count(*) FROM public.legal_acceptances GROUP BY 1, 2 ORDER BY 1, 2;
--   (guardar as contagens: depois do teste têm de ser iguais)
--
-- Como correr: BEGIN; colar drizzle/migrations/0077_legal_versions_2026_11_23.sql; colar o bloco DO;
-- ROLLBACK;   Termina SEMPRE com TEST_0077_ROLLBACK.
--
-- Casos:
--   V1  current_legal_versions() devolve 2026-11-23 / 2026-11-23                    → [V1 OK]
--   A1  anon continua sem EXECUTE em current_legal_versions                          → [A1 OK]
--   G1  turista com aceitação antiga NÃO tem a versão nova (o gate vai pedir)        → [G1 OK]
--   P1  accept_legal_documents com a versão antiga → LEGAL_VERSION_MISMATCH         → [P1 OK]
--   P2  accept_legal_documents com 2026-11-23 grava 2 linhas (source = prompt)       → [P2 OK]
--   H1  a aceitação antiga continua guardada (histórico)                             → [H1 OK]
-- Confirmar no fim: as contagens do PASSO 0 não mudaram e current_legal_versions() voltou a 2026-11-07.
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  v jsonb := public.current_legal_versions();
  tour uuid := (SELECT a.user_id FROM public.legal_acceptances a
                  JOIN public.user_roles ur ON ur.user_id = a.user_id AND ur.role = 'tourist'
                 WHERE a.document = 'terms' AND a.version = '2026-11-07'
                 ORDER BY a.user_id LIMIT 1);
BEGIN
  r := r || CASE WHEN v ->> 'terms' = '2026-11-23' AND v ->> 'privacy' = '2026-11-23'
                 THEN '[V1 OK] ' ELSE '[V1 ERRO ' || v::text || '] ' END;

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN PERFORM public.current_legal_versions(); r := r || '[A1 ERRO executou] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[A1 OK] '; END;
  RESET ROLE;

  IF tour IS NULL THEN
    RAISE EXCEPTION 'TEST_0077_ROLLBACK % [G1/P1/P2/H1 NÃO CORRIDOS: nenhum turista com aceitação 2026-11-07]', r;
  END IF;

  SELECT count(*) INTO n FROM public.legal_acceptances WHERE user_id = tour AND version = '2026-11-23';
  r := r || CASE WHEN n = 0 THEN '[G1 OK] ' ELSE '[G1 ERRO ' || n || '] ' END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.accept_legal_documents('2026-11-07', '2026-11-07');
    r := r || '[P1 ERRO aceitou] ';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM = 'LEGAL_VERSION_MISMATCH' THEN '[P1 OK] ' ELSE '[P1 ERRO ' || SQLERRM || '] ' END;
  END;
  PERFORM public.accept_legal_documents('2026-11-23', '2026-11-23');
  RESET ROLE;

  SELECT count(*) INTO n FROM public.legal_acceptances
   WHERE user_id = tour AND version = '2026-11-23' AND source = 'prompt';
  r := r || CASE WHEN n = 2 THEN '[P2 OK] ' ELSE '[P2 ERRO ' || n || '] ' END;
  SELECT count(*) INTO n FROM public.legal_acceptances WHERE user_id = tour AND version = '2026-11-07';
  r := r || CASE WHEN n >= 1 THEN '[H1 OK] ' ELSE '[H1 ERRO] ' END;

  RAISE EXCEPTION 'TEST_0077_ROLLBACK %', r;
END $$;
