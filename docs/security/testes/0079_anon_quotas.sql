-- =====================================================================================
-- Guião de teste da PROPOSTA 0079 — quotas por IP nas escritas anónimas
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar):
--   SELECT count(*) FROM public.app_errors;            -- guardar
--   SELECT count(*) FROM public.assistant_unanswered;  -- guardar
--   SELECT count(*) FROM public.assistant_feedback;    -- guardar
--   SELECT slug FROM public.assistant_faq_entries ORDER BY slug LIMIT 1;  -- tem de existir uma entrada
--
-- Como correr: BEGIN; colar drizzle/migrations/0079_anon_quotas_per_ip.sql; colar o bloco DO; ROLLBACK;
-- Termina SEMPRE com TEST_0079_ROLLBACK. Os pedidos simulados usam o IP de teste 203.0.113.7
-- (bloco reservado para documentação, RFC 5737) em request.headers.
--
-- Casos (anon):
--   E1  log_app_error: 50 gravam, o 51.º não (sem erro)                      → [E1 OK]
--   U1  assistant_log_unanswered: 20 gravam, o 21.º não                       → [U1 OK]
--   R1  assistant_rate_answer: 1.ª avaliação de uma resposta grava, 2.ª não   → [R1 OK]
--   I1  outro IP (203.0.113.8) continua a poder registar um erro              → [I1 OK]
--   A1  anon não lê anon_quota nem executa anon_quota_take                    → [A1 OK]
--   H1  nenhum IP em claro em anon_quota                                      → [H1 OK]
-- Confirmar no fim: as contagens do PASSO 0 não mudaram.
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n0 int; n int; i int;
  slug text := (SELECT e.slug FROM public.assistant_faq_entries e ORDER BY e.slug LIMIT 1);
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('request.headers', '{"cf-connecting-ip":"203.0.113.7"}', true);
  -- As contagens fazem-se como dono (o anon não lê estas tabelas); as chamadas, como anon.
  SELECT count(*) INTO n0 FROM public.app_errors;
  SET LOCAL ROLE anon;
  FOR i IN 1..51 LOOP PERFORM public.log_app_error('client', '/test-0079', 'TEST_0079 erro ' || i, 'test'); END LOOP;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.app_errors;
  r := r || CASE WHEN n - n0 = 50 THEN '[E1 OK] ' ELSE '[E1 ERRO ' || (n - n0) || '] ' END;

  SELECT count(*) INTO n0 FROM public.assistant_unanswered;
  SET LOCAL ROLE anon;
  FOR i IN 1..21 LOOP PERFORM public.assistant_log_unanswered('TEST_0079 pergunta ' || i, 'pt'); END LOOP;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.assistant_unanswered;
  r := r || CASE WHEN n - n0 = 20 THEN '[U1 OK] ' ELSE '[U1 ERRO ' || (n - n0) || '] ' END;

  IF slug IS NULL THEN
    r := r || '[R1 NÃO CORRIDO sem FAQ] ';
  ELSE
    SELECT count(*) INTO n0 FROM public.assistant_feedback;
    SET LOCAL ROLE anon;
    PERFORM public.assistant_rate_answer(slug, true, 'pt');
    PERFORM public.assistant_rate_answer(slug, false, 'pt');
    RESET ROLE;
    SELECT count(*) INTO n FROM public.assistant_feedback;
    r := r || CASE WHEN n - n0 = 1 THEN '[R1 OK] ' ELSE '[R1 ERRO ' || (n - n0) || '] ' END;
  END IF;

  SELECT count(*) INTO n0 FROM public.app_errors;
  PERFORM set_config('request.headers', '{"cf-connecting-ip":"203.0.113.8"}', true);
  SET LOCAL ROLE anon;
  PERFORM public.log_app_error('client', '/test-0079', 'TEST_0079 outro ip', 'test');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.app_errors;
  r := r || CASE WHEN n - n0 = 1 THEN '[I1 OK] ' ELSE '[I1 ERRO ' || (n - n0) || '] ' END;

  SET LOCAL ROLE anon;
  BEGIN PERFORM 1 FROM public.anon_quota LIMIT 1; r := r || '[A1 ERRO leu] ';
  EXCEPTION WHEN insufficient_privilege THEN
    BEGIN PERFORM public.anon_quota_take('x', 1); r := r || '[A1 ERRO executou] ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || '[A1 OK] '; END;
  END;
  RESET ROLE;

  SELECT count(*) INTO n FROM public.anon_quota WHERE ip_day_hash LIKE '%203.0.113%';
  r := r || CASE WHEN n = 0 THEN '[H1 OK] ' ELSE '[H1 ERRO] ' END;

  RAISE EXCEPTION 'TEST_0079_ROLLBACK %', r;
END $$;
