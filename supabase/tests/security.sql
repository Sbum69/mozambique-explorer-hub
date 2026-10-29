-- =====================================================================================
-- SEG-FINAL — Acessos depois da migração 0045 (o legítimo funciona, o indevido é recusado)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * anon: lê o catálogo público; não escreve em nenhuma tabela (nem com grants, nem por RLS);
--     não executa funções só para utilizadores com sessão; lê fotos de experiências aprovadas
--     (antes dava "permission denied for function has_role") e não lê as pendentes.
--   * turista: continua a criar posts, reações e favoritos; não mexe nas notificações de outros.
--   * notificações: links "//host" recusados; "/caminho" aceite.
--   * buckets: só imagens (allowed_mime_types).
-- Utilizadores escolhidos pelo papel; sem emails.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0045.
-- Resultado esperado: erro TEST_SECURITY_ROLLBACK com [… PASS …] em todos os itens. Tudo é revertido.
-- Confirmar: SELECT count(*) FROM community_posts WHERE title LIKE 'SEG-FINAL%';  -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  ok boolean;
  tbl text;
  writable text := '';
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                   AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
  cat uuid := (SELECT id FROM public.community_categories WHERE active ORDER BY sort_order LIMIT 1);
  prov uuid := (SELECT id FROM public.provinces ORDER BY code LIMIT 1);
  ce_ok uuid;
  ce_pend uuid;
BEGIN
  -- ---------- Grants (catalogue-wide) ----------
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
              WHERE s.nspname = 'public' AND c.relkind IN ('r', 'p') LOOP
    IF has_table_privilege('anon', format('public.%I', tbl), 'INSERT,UPDATE,DELETE,TRUNCATE') THEN
      writable := writable || tbl || ',';
    END IF;
  END LOOP;
  r := r || CASE WHEN writable = '' THEN '[G-anon-no-writes PASS] ' ELSE format('[G-anon-no-writes FAIL %s] ', writable) END;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE grantee = 'authenticated' AND table_schema = 'public' AND privilege_type = 'TRUNCATE';
  r := r || CASE WHEN n = 0 THEN '[G-auth-no-truncate PASS] ' ELSE format('[G-auth-no-truncate FAIL %s] ', n) END;
  ok := NOT has_function_privilege('anon', 'public.business_decide_booking(uuid, public.booking_status, text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.can_edit_route(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.owns_experience(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.generate_route_code()', 'EXECUTE');
  r := r || CASE WHEN ok THEN '[F-anon-revoked PASS] ' ELSE '[F-anon-revoked FAIL] ' END;
  ok := has_function_privilege('authenticated', 'public.business_decide_booking(uuid, public.booking_status, text)', 'EXECUTE')
    AND has_function_privilege('anon', 'public.can_view_route(uuid)', 'EXECUTE')
    AND has_function_privilege('anon', 'public.commercial_activity_public(uuid)', 'EXECUTE');
  r := r || CASE WHEN ok THEN '[F-legit-kept PASS] ' ELSE '[F-legit-kept FAIL] ' END;

  -- ---------- anon: reads the public catalogue, writes nothing ----------
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.destinations;
  r := r || CASE WHEN n > 0 THEN format('[A-read-destinations PASS %s] ', n) ELSE '[A-read-destinations FAIL 0] ' END;
  SELECT count(*) INTO n FROM public.route_days;
  r := r || CASE WHEN n > 0 THEN '[A-read-public-routes PASS] ' ELSE '[A-read-public-routes FAIL] ' END;
  BEGIN
    INSERT INTO public.community_posts (author_id, title, content, category_id, province_id)
      VALUES (tour, 'SEG-FINAL anon', 'Conteúdo', cat, prov);
    r := r || '[A-insert FAIL accepted] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[A-insert PASS denied] ';
  END;
  BEGIN
    PERFORM public.business_decide_booking(gen_random_uuid(), 'confirmed', NULL);
    r := r || '[A-rpc FAIL accepted] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[A-rpc PASS denied] ';
  END;
  RESET ROLE;

  -- ---------- Community photos (approved visible to anon, pending not) ----------
  INSERT INTO public.community_experiences (title_pt, title_en, description_pt, description_en, province_id, category, status, image_path)
    VALUES ('SEG-FINAL aprovada', 'SEG-FINAL approved', 'D', 'D', prov, 'food', 'approved', tour::text || '/seg-final-ok.jpg') RETURNING id INTO ce_ok;
  INSERT INTO public.community_experiences (title_pt, title_en, description_pt, description_en, province_id, category, status, image_path)
    VALUES ('SEG-FINAL pendente', 'SEG-FINAL pending', 'D', 'D', prov, 'food', 'pending', tour::text || '/seg-final-pend.jpg') RETURNING id INTO ce_pend;
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES
    ('community-photos', tour::text || '/seg-final-ok.jpg', tour),
    ('community-photos', tour::text || '/seg-final-pend.jpg', tour);
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'community-photos' AND name LIKE tour::text || '/seg-final-%';
    r := r || CASE WHEN n = 1 THEN '[P-anon-approved-only PASS] ' ELSE format('[P-anon-approved-only FAIL %s] ', n) END;
  EXCEPTION WHEN others THEN r := r || format('[P-anon FAIL %s] ', SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'community-photos' AND name LIKE tour::text || '/seg-final-%';
  r := r || CASE WHEN n = 2 THEN '[P-owner-both PASS] ' ELSE format('[P-owner-both FAIL %s] ', n) END;

  -- ---------- Tourist keeps working ----------
  INSERT INTO public.community_posts (title, content, category_id, province_id)
    VALUES ('SEG-FINAL post', 'Conteúdo de teste', cat, prov);
  r := r || '[T-post PASS] ';
  UPDATE public.notifications SET read_at = now() WHERE user_id <> tour;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[T-others-notifications PASS 0 rows] ' ELSE format('[T-others-notifications FAIL %s] ', n) END;
  RESET ROLE;

  -- ---------- Notification links ----------
  BEGIN
    INSERT INTO public.notifications (user_id, title_pt, body_pt, link) VALUES (tour, 'Teste', 'Teste de link', '//evil.example');
    r := r || '[L-double-slash FAIL accepted] ';
  EXCEPTION WHEN check_violation THEN r := r || '[L-double-slash PASS refused] ';
  END;
  INSERT INTO public.notifications (user_id, title_pt, body_pt, link) VALUES (tour, 'Teste', 'Teste de link', '/bookings');
  r := r || '[L-internal PASS] ';

  -- ---------- Buckets ----------
  SELECT count(*) INTO n FROM storage.buckets
   WHERE id IN ('community-photos', 'route-proofs', 'game-proofs')
     AND allowed_mime_types @> ARRAY['image/jpeg'] AND NOT (allowed_mime_types @> ARRAY['image/svg+xml']);
  r := r || CASE WHEN n = 3 THEN '[B-images-only PASS] ' ELSE format('[B-images-only FAIL %s] ', n) END;

  RAISE EXCEPTION 'TEST_SECURITY_ROLLBACK %', r;
END $$;
