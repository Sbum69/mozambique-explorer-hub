-- =====================================================================================
-- DADOS-1 — Câmbio (migração 0040)
-- -------------------------------------------------------------------------------------
-- O que testa: leitura pública das taxas; anon e authenticated não escrevem nem chamam as funções do cron; uma resposta incompleta do fornecedor não altera as taxas.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro TEST_EXCHANGE_ROLLBACK com 'denied' em todas as escritas e 'MZN unchanged=true'. Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   TEST_EXCHANGE_ROLLBACK anon read=5; insert denied; update denied; delete denied; request()
--   denied; apply() denied; requests log denied; authenticated read=5; insert denied; update
--   denied; delete denied; request() denied; apply() denied; requests log denied; incomplete answer
--   -> apply=-1, outcome=RATES_MISSING_MZN, MZN unchanged=t
-- Confirmar depois, por leitura: SELECT count(*) FROM exchange_rate_requests WHERE request_id = 999999;  -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  mzn_before numeric;
  res int;
  role_name text;
  uid uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                   AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
BEGIN
  SELECT per_usd INTO mzn_before FROM public.exchange_rates WHERE currency = 'MZN';

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF role_name = 'authenticated' THEN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    END IF;
    EXECUTE format('SET LOCAL ROLE %I', role_name);

    SELECT count(*) INTO n FROM public.exchange_rates;
    r := r || format('%s read=%s; ', role_name, n);

    BEGIN INSERT INTO public.exchange_rates VALUES ('USD', 1, now(), 'x', now()); r := r || 'INSERT ALLOWED!; ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || 'insert denied; '; END;
    BEGIN UPDATE public.exchange_rates SET per_usd = 1 WHERE currency = 'MZN'; r := r || 'UPDATE ALLOWED!; ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || 'update denied; '; END;
    BEGIN DELETE FROM public.exchange_rates; r := r || 'DELETE ALLOWED!; ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || 'delete denied; '; END;
    BEGIN PERFORM public.request_exchange_rates(); r := r || 'REQUEST ALLOWED!; ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || 'request() denied; '; END;
    BEGIN PERFORM public.apply_exchange_rates(); r := r || 'APPLY ALLOWED!; ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || 'apply() denied; '; END;
    BEGIN PERFORM count(*) FROM public.exchange_rate_requests; r := r || 'REQUESTS READABLE!; ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || 'requests log denied; '; END;

    RESET ROLE;
  END LOOP;

  -- Incomplete provider answer (MZN missing): must be rejected and keep the previous rates.
  INSERT INTO net._http_response (id, status_code, content, timed_out, created)
  VALUES (999999, 200, '{"result":"success","time_last_update_unix":1793000000,"rates":{"USD":1,"EUR":0.9}}', false, now());
  INSERT INTO public.exchange_rate_requests (request_id, requested_at) VALUES (999999, now() + interval '1 second');
  res := public.apply_exchange_rates();
  r := r || format('incomplete answer -> apply=%s, outcome=%s, MZN unchanged=%s',
        res, (SELECT outcome FROM public.exchange_rate_requests WHERE request_id = 999999),
        (SELECT per_usd FROM public.exchange_rates WHERE currency = 'MZN') = mzn_before);

  RAISE EXCEPTION 'TEST_EXCHANGE_ROLLBACK %', r;
END $$;
