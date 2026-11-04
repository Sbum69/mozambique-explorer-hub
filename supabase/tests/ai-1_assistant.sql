-- =====================================================================================
-- AI-1 — assistente fase 1 (0056)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * a FAQ inicial existe e qualquer pessoa lê as entradas ativas (não as inativas);
--   * só o admin (com 2FA) cria ou muda entradas; cada mudança guarda a versão anterior e é
--     auditada; as versões não se alteram;
--   * perguntas sem resposta: anónimas, com emails e números mascarados, só o admin lê;
--     apagadas ao fim de 30 dias; o mesmo para as avaliações 👍/👎;
--   * o contador de quota da fase 2 não é acessível pelo browser.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0056.
-- Resultado esperado: erro TEST_AI1_ROLLBACK com [… PASS …]. Tudo é revertido.
-- =====================================================================================
DO $$
DECLARE
  r text := ''; n int; eid uuid; t text;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
     ORDER BY ur.user_id LIMIT 1);
BEGIN
  SELECT count(*) INTO n FROM public.assistant_faq_entries;
  r := r || CASE WHEN n BETWEEN 30 AND 50 THEN ' A-seed(' || n || '):PASS' ELSE ' A-seed:FAIL(' || n || ')' END;
  UPDATE public.assistant_faq_entries SET active = false WHERE slug = 'jogos';
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.assistant_faq_entries WHERE slug = 'jogos';
  r := r || CASE WHEN n = 0 THEN ' A-inactive-hidden:PASS' ELSE ' A-inactive-hidden:FAIL' END;
  SELECT count(*) INTO n FROM public.assistant_faq_entries;
  r := r || CASE WHEN n > 0 THEN ' A-anon-reads:PASS' ELSE ' A-anon-reads:FAIL' END;
  BEGIN UPDATE public.assistant_faq_entries SET answer_pt = 'x' WHERE slug = 'mapa'; r := r || ' A-anon-write:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-write:PASS'; END;
  PERFORM public.assistant_log_unanswered('O meu email é ana@example.org e o telefone 84 123 4567, há wifi?', 'pt');
  PERFORM public.assistant_rate_answer('mapa', true, 'pt');
  PERFORM public.assistant_rate_answer('nao-existe', false, 'pt');
  BEGIN PERFORM count(*) FROM public.assistant_unanswered; r := r || ' A-anon-read-unanswered:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-anon-read-unanswered:PASS'; END;
  RESET ROLE;
  SELECT question INTO t FROM public.assistant_unanswered ORDER BY created_at DESC LIMIT 1;
  r := r || CASE WHEN t LIKE '%[email]%' AND t LIKE '%[número]%' AND t NOT LIKE '%ana@%' THEN ' B-masked:PASS' ELSE ' B-masked:FAIL(' || coalesce(t, 'null') || ')' END;
  SELECT count(*) INTO n FROM public.assistant_feedback WHERE created_at > now() - interval '1 minute';
  r := r || CASE WHEN n = 1 THEN ' B-feedback-valid-only:PASS' ELSE ' B-feedback-valid-only:FAIL(' || n || ')' END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.admin_save_faq_entry(NULL, '{"slug":"teste-ai1","topic":"x1","question_pt":"Pergunta?","question_en":"Question?","answer_pt":"Resposta.","answer_en":"Answer."}', 'x');
    r := r || ' C-tourist-save:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' C-tourist-save:PASS' ELSE ' C-tourist-save:FAIL(' || SQLERRM || ')' END; END;
  SELECT count(*) INTO n FROM public.assistant_unanswered;
  r := r || CASE WHEN n = 0 THEN ' C-tourist-read-unanswered:PASS' ELSE ' C-tourist-read-unanswered:FAIL' END;
  BEGIN PERFORM count(*) FROM public.assistant_llm_usage; r := r || ' C-quota-hidden:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' C-quota-hidden:PASS'; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.admin_save_faq_entry(NULL, '{"slug":"teste-ai1","topic":"x1","question_pt":"Pergunta?","question_en":"Question?","answer_pt":"Resposta.","answer_en":"Answer."}', 'x');
    r := r || ' D-admin-needs-2fa:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' D-admin-needs-2fa:PASS' ELSE ' D-admin-needs-2fa:FAIL(' || SQLERRM || ')' END; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  eid := public.admin_save_faq_entry(NULL, '{"slug":"teste-ai1","topic":"x1","question_pt":"Pergunta de teste?","question_en":"Test question?","answer_pt":"Resposta de teste.","answer_en":"Test answer.","keywords_pt":["teste"],"keywords_en":["test"],"needs_validation":true}', 'Teste AI-1');
  PERFORM public.admin_save_faq_entry(eid, '{"answer_pt":"Resposta corrigida."}', 'Correção');
  SELECT count(*) INTO n FROM public.assistant_faq_entries WHERE id = eid AND version = 2 AND answer_pt = 'Resposta corrigida.' AND answer_en = 'Test answer.' AND keywords_pt = ARRAY['teste'];
  r := r || CASE WHEN n = 1 THEN ' D-update-keeps-rest:PASS' ELSE ' D-update-keeps-rest:FAIL' END;
  SELECT count(*) INTO n FROM public.assistant_faq_versions WHERE entry_id = eid AND version = 1 AND snapshot ->> 'answer_pt' = 'Resposta de teste.';
  r := r || CASE WHEN n = 1 THEN ' D-version-kept:PASS' ELSE ' D-version-kept:FAIL' END;
  SELECT count(*) INTO n FROM public.admin_audit WHERE entity = 'assistant_faq_entries' AND entity_id = eid::text;
  r := r || CASE WHEN n = 2 THEN ' D-audited:PASS' ELSE ' D-audited:FAIL(' || n || ')' END;
  SELECT count(*) INTO n FROM public.assistant_unanswered;
  r := r || CASE WHEN n >= 1 THEN ' D-admin-reads-unanswered:PASS' ELSE ' D-admin-reads-unanswered:FAIL' END;
  RESET ROLE;
  BEGIN UPDATE public.assistant_faq_versions SET reason = 'x'; r := r || ' E-versions-append-only:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM LIKE 'APPEND_ONLY%' THEN ' E-versions-append-only:PASS' ELSE ' E-versions-append-only:FAIL(' || SQLERRM || ')' END; END;
  UPDATE public.assistant_unanswered SET created_at = now() - interval '31 days';
  UPDATE public.assistant_feedback SET created_at = now() - interval '31 days';
  PERFORM public.assistant_purge_old();
  SELECT (SELECT count(*) FROM public.assistant_unanswered) + (SELECT count(*) FROM public.assistant_feedback) INTO n;
  r := r || CASE WHEN n = 0 THEN ' E-purge-30-days:PASS' ELSE ' E-purge-30-days:FAIL' END;
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'ekaya-assistant-purge';
  r := r || CASE WHEN n = 1 THEN ' E-cron:PASS' ELSE ' E-cron:FAIL' END;
  RAISE EXCEPTION 'TEST_AI1_ROLLBACK %', r;
END $$;
