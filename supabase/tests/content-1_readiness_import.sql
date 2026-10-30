-- =====================================================================================
-- CONTEÚDO-1 — pronto para publicar, importação como rascunho e convites (0051)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * uma experiência só fica ativa sem nada em falta; tirar a última foto de uma ativa é recusado;
--     preço 0 (gratuita) é aceite;
--   * content_readiness: outro utilizador recusado (também em negócios sem dono, 0052), admin lê;
--   * importação: só admin; anon recusado; simulação com erros por linha e duplicados sem escrever;
--     importação real cria negócio pendente sem dono e experiência inativa com horários;
--   * convites: o admin cria; o turista vê o nome, aceita e fica dono (papel de negócio);
--     o mesmo link não volta a servir; convite expirado recusado.
-- Utilizadores escolhidos pelo papel; dados criados aqui e revertidos no fim.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0051.
-- Resultado esperado: erro TEST_CONTENT1_ROLLBACK com [… PASS …]. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM public.businesses WHERE name LIKE 'QA Conteúdo%'; -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  res jsonb;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
                 AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
                 AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
  dest uuid := (SELECT id FROM public.destinations WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY slug LIMIT 1);
  dest_slug text;
  prov_code text := (SELECT code FROM public.provinces WHERE active ORDER BY code LIMIT 1);
  biz uuid;
  exp uuid;
  tok text;
BEGIN
  SELECT slug INTO dest_slug FROM public.destinations WHERE id = dest;

  -- ---------- as admin (aal2) ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;

  -- Import: dry run with one good business, one bad business, one experience for the new business.
  res := public.admin_import_content(jsonb_build_array(
    jsonb_build_object('kind', 'business', 'name', 'QA Conteúdo Negócio', 'province', prov_code, 'category', 'restaurant',
                       'description', 'Restaurante de teste com descrição suficiente.', 'address', 'Rua de teste', 'phone', '+258 840000000'),
    jsonb_build_object('kind', 'business', 'name', 'QA Conteúdo Sem Província', 'province', 'nada', 'category', 'restaurant'),
    jsonb_build_object('kind', 'experience', 'business_name', 'QA Conteúdo Negócio', 'business_province', prov_code,
                       'title_pt', 'QA Conteúdo Passeio', 'title_en', 'QA Content Tour', 'category', 'culture',
                       'description_pt', 'Descrição em português suficientemente longa.',
                       'description_en', 'English description that is long enough.',
                       'price_mzn', '1500', 'capacity', '8', 'destination', dest_slug,
                       'days', 'seg,qua', 'start_time', '09:00', 'end_time', '11:00')
  ), true);
  r := r || CASE WHEN res -> 0 ->> 'status' = 'ok' AND res -> 1 ->> 'status' = 'error'
                  AND (res -> 1 -> 'errors') ? 'province' AND res -> 2 ->> 'status' = 'ok'
                 THEN ' A-dry-run:PASS' ELSE ' A-dry-run:FAIL(' || res::text || ')' END;
  SELECT count(*) INTO n FROM public.businesses WHERE name LIKE 'QA Conteúdo%';
  r := r || CASE WHEN n = 0 THEN ' A-dry-run-writes-nothing:PASS' ELSE ' A-dry-run-writes-nothing:FAIL' END;

  -- Real import (only the good rows).
  res := public.admin_import_content(jsonb_build_array(
    jsonb_build_object('kind', 'business', 'name', 'QA Conteúdo Negócio', 'province', prov_code, 'category', 'restaurant',
                       'description', 'Restaurante de teste com descrição suficiente.', 'address', 'Rua de teste', 'phone', '+258 840000000'),
    jsonb_build_object('kind', 'experience', 'business_name', 'QA Conteúdo Negócio', 'business_province', prov_code,
                       'title_pt', 'QA Conteúdo Passeio', 'title_en', 'QA Content Tour', 'category', 'culture',
                       'description_pt', 'Descrição em português suficientemente longa.',
                       'description_en', 'English description that is long enough.',
                       'price_mzn', '1500', 'capacity', '8', 'destination', dest_slug,
                       'days', 'seg,qua', 'start_time', '09:00', 'end_time', '11:00')
  ), false);
  biz := (res -> 0 ->> 'id')::uuid;
  exp := (res -> 1 ->> 'id')::uuid;
  SELECT count(*) INTO n FROM public.businesses WHERE id = biz AND status = 'pending' AND owner_id IS NULL;
  r := r || CASE WHEN n = 1 THEN ' B-import-business-draft:PASS' ELSE ' B-import-business-draft:FAIL' END;
  SELECT count(*) INTO n FROM public.experiences e WHERE e.id = exp AND NOT e.active
     AND (SELECT count(*) FROM public.experience_availability a WHERE a.experience_id = e.id) = 2;
  r := r || CASE WHEN n = 1 THEN ' B-import-experience-draft:PASS' ELSE ' B-import-experience-draft:FAIL' END;

  -- Duplicate on a second import.
  res := public.admin_import_content(jsonb_build_array(
    jsonb_build_object('kind', 'business', 'name', 'qa conteúdo negócio', 'province', prov_code, 'category', 'restaurant')), true);
  r := r || CASE WHEN res -> 0 ->> 'status' = 'duplicate' THEN ' C-duplicate:PASS' ELSE ' C-duplicate:FAIL' END;

  -- Readiness: only the photo is missing.
  res := public.content_readiness(biz);
  r := r || CASE WHEN res -> 'experiences' -> 0 -> 'missing' = '["photo"]'::jsonb
                 THEN ' D-readiness-photo-only:PASS' ELSE ' D-readiness:FAIL(' || (res -> 'experiences')::text || ')' END;

  -- Activation blocked while something is missing.
  BEGIN
    UPDATE public.experiences SET active = true WHERE id = exp;
    r := r || ' E-activate-not-ready:FAIL';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM LIKE 'EXPERIENCE_NOT_READY:%photo%' THEN ' E-activate-not-ready:PASS' ELSE ' E-activate-not-ready:FAIL(' || SQLERRM || ')' END;
  END;
  UPDATE public.experiences SET images = ARRAY['https://example.invalid/qa.jpg'] WHERE id = exp;
  UPDATE public.experiences SET active = true WHERE id = exp;
  SELECT count(*) INTO n FROM public.experiences WHERE id = exp AND active;
  r := r || CASE WHEN n = 1 THEN ' E-activate-ready:PASS' ELSE ' E-activate-ready:FAIL' END;
  -- Free activity (price 0) stays publishable.
  UPDATE public.experiences SET price_mzn = 0 WHERE id = exp;
  SELECT count(*) INTO n FROM public.experiences WHERE id = exp AND active AND price_mzn = 0;
  r := r || CASE WHEN n = 1 THEN ' E-free-activity:PASS' ELSE ' E-free-activity:FAIL' END;
  BEGIN
    UPDATE public.experiences SET images = ARRAY[]::text[] WHERE id = exp;
    r := r || ' E-remove-last-photo:FAIL';
  EXCEPTION WHEN OTHERS THEN r := r || ' E-remove-last-photo:PASS';
  END;

  -- Invite.
  tok := public.admin_create_business_invite(biz, 14);
  r := r || CASE WHEN length(tok) = 48 THEN ' F-invite-created:PASS' ELSE ' F-invite-created:FAIL' END;
  SELECT count(*) INTO n FROM public.business_invites WHERE business_id = biz AND token_hash <> tok;
  r := r || CASE WHEN n = 1 THEN ' F-invite-hash-only:PASS' ELSE ' F-invite-hash-only:FAIL' END;
  RESET ROLE;

  -- ---------- anon ----------
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.admin_import_content('[]'::jsonb, true);
    r := r || ' G-anon-import:FAIL';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' G-anon-import:PASS';
  END;
  RESET ROLE;

  -- ---------- tourist ----------
  IF tour IS NULL THEN
    r := r || ' H-tourist:SKIP(no tourist without business)';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.admin_import_content('[]'::jsonb, true);
      r := r || ' H-tourist-import:FAIL';
    EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' H-tourist-import:PASS' ELSE ' H-tourist-import:FAIL(' || SQLERRM || ')' END;
    END;
    BEGIN
      PERFORM public.content_readiness(biz);
      r := r || ' H-tourist-readiness:FAIL';
    EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' H-tourist-readiness:PASS' ELSE ' H-tourist-readiness:FAIL(' || SQLERRM || ')' END;
    END;
    res := public.business_invite_preview(tok);
    r := r || CASE WHEN res ->> 'business_name' = 'QA Conteúdo Negócio' THEN ' I-preview:PASS' ELSE ' I-preview:FAIL' END;
    PERFORM public.claim_business_invite(tok);
    SELECT count(*) INTO n FROM public.businesses WHERE id = biz AND owner_id = tour;
    r := r || CASE WHEN n = 1 THEN ' I-claim-owner:PASS' ELSE ' I-claim-owner:FAIL' END;
    r := r || CASE WHEN public.has_role(tour, 'business_small') THEN ' I-claim-role:PASS' ELSE ' I-claim-role:FAIL' END;
    BEGIN
      PERFORM public.claim_business_invite(tok);
      r := r || ' I-single-use:FAIL';
    EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'INVITE_INVALID' THEN ' I-single-use:PASS' ELSE ' I-single-use:FAIL(' || SQLERRM || ')' END;
    END;
    -- The new owner now reads the readiness of their business.
    res := public.content_readiness(biz);
    r := r || CASE WHEN res ->> 'business_id' = biz::text THEN ' I-owner-readiness:PASS' ELSE ' I-owner-readiness:FAIL' END;
    RESET ROLE;
  END IF;

  -- ---------- expired invite ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  RESET ROLE;
  UPDATE public.businesses SET owner_id = NULL WHERE id = biz;
  INSERT INTO public.business_invites (business_id, token_hash, created_by, created_at, expires_at)
  VALUES (biz, encode(extensions.digest('qa-expired', 'sha256'), 'hex'), adm, now() - interval '20 days', now() - interval '1 day');
  IF tour IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.business_invite_preview('qa-expired');
      r := r || ' J-expired:FAIL';
    EXCEPTION WHEN OTHERS THEN r := r || CASE WHEN SQLERRM = 'INVITE_INVALID' THEN ' J-expired:PASS' ELSE ' J-expired:FAIL(' || SQLERRM || ')' END;
    END;
    RESET ROLE;
  END IF;

  RAISE EXCEPTION 'TEST_CONTENT1_ROLLBACK [%]', r;
END $$;
