-- =====================================================================================
-- TESTES-1 — Comunidade: posts, reações, denúncias, experiências comunitárias e fotos
-- -------------------------------------------------------------------------------------
-- O que testa (regras das migrações 0007, 0015, 0016 e 0017):
--   * posts: são publicados logo (sem moderação prévia); quem não é admin não escolhe o
--     estado nem o autor; o visitante só vê publicados; o autor vê os seus ocultos; outro
--     utilizador não os vê; só o autor (ou o admin) edita e apaga.
--   * reações: o user_id é sempre o de quem reage.
--   * denúncias: o denunciante é forçado; só o próprio e o admin leem; só o admin resolve;
--     resolved_by/resolved_at são carimbados.
--   * experiências comunitárias: a proposta fica pendente; o visitante só vê aprovadas e
--     ativas; o autor vê as suas; quem não é admin não aprova; a decisão notifica o autor.
--   * fotos (storage community-photos): leitura só se aprovada, própria ou admin.
-- Utilizadores: escolhidos pelo papel (admin, turista sem negócio, outro perfil); sem emails.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: termina SEMPRE com o erro TEST_COMMUNITY_ROLLBACK (tudo é revertido);
--   a mensagem lista [… PASS …] em todos os itens e nenhum [… FAIL …].
-- Confirmar depois, por leitura, que não ficou nada:
--   SELECT count(*) FROM community_posts WHERE title LIKE 'TESTES-1%';                  -- 0
--   SELECT count(*) FROM community_experiences WHERE title_pt LIKE 'TESTES-1%';         -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  st text;
  who uuid;
  t text;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                   AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
  other uuid;
  cat uuid := (SELECT id FROM public.community_categories WHERE active ORDER BY sort_order LIMIT 1);
  prov uuid := (SELECT id FROM public.provinces ORDER BY code LIMIT 1);
  p_pub uuid;
  p_hid uuid;
  rep uuid;
  ce_pend uuid;
  photo boolean := false;
BEGIN
  SELECT p.id INTO other FROM public.profiles p
   WHERE p.id NOT IN (adm, tour)
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = p.id AND a.role = 'admin')
   ORDER BY p.id LIMIT 1;
  IF adm IS NULL OR tour IS NULL OR other IS NULL OR cat IS NULL OR prov IS NULL THEN
    RAISE EXCEPTION 'TEST_COMMUNITY_ROLLBACK [SETUP FAIL admin=% tourist=% other=% cat=% prov=%]', adm, tour, other, cat, prov;
  END IF;

  -- ---------- Posts ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  -- Asks for another author and status 'hidden': the trigger forces own id + 'published'.
  INSERT INTO public.community_posts (author_id, title, content, category_id, province_id, status)
    VALUES (tour, 'TESTES-1 publicado', 'Conteúdo de teste', cat, prov, 'hidden')
    RETURNING id, status INTO p_pub, st;
  r := r || CASE WHEN st = 'published' THEN '[P-create PASS published] ' ELSE format('[P-create FAIL %s] ', st) END;
  BEGIN
    INSERT INTO public.community_posts (author_id, title, content, category_id, province_id)
      VALUES (other, 'TESTES-1 alheio', 'Conteúdo de teste', cat, prov) RETURNING author_id INTO who;
    r := r || CASE WHEN who = tour THEN '[P-author-forced PASS] ' ELSE '[P-author-forced FAIL] ' END;
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[P-author-forced PASS refused] ';
  END;
  INSERT INTO public.community_posts (title, content, category_id, province_id)
    VALUES ('TESTES-1 a ocultar', 'Conteúdo de teste', cat, prov) RETURNING id INTO p_hid;
  -- The author edits; a status change is ignored for non-admins.
  UPDATE public.community_posts SET title = 'TESTES-1 editado', status = 'hidden' WHERE id = p_pub;
  SELECT title, status INTO t, st FROM public.community_posts WHERE id = p_pub;
  r := r || CASE WHEN t = 'TESTES-1 editado' AND st = 'published' THEN '[P-edit PASS status kept] ' ELSE format('[P-edit FAIL %s/%s] ', t, st) END;
  RESET ROLE;

  -- Admin hides the second post.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.community_posts SET status = 'hidden' WHERE id = p_hid;
  SELECT status INTO st FROM public.community_posts WHERE id = p_hid;
  r := r || CASE WHEN st = 'hidden' THEN '[P-admin-hide PASS] ' ELSE format('[P-admin-hide FAIL %s] ', st) END;
  RESET ROLE;

  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.community_posts WHERE id IN (p_pub, p_hid);
  r := r || CASE WHEN n = 1 THEN '[P-anon PASS sees 1] ' ELSE format('[P-anon FAIL sees %s] ', n) END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_posts WHERE id IN (p_pub, p_hid);
  r := r || CASE WHEN n = 2 THEN '[P-author-sees-hidden PASS] ' ELSE format('[P-author-sees-hidden FAIL %s] ', n) END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_posts WHERE id IN (p_pub, p_hid);
  r := r || CASE WHEN n = 1 THEN '[P-other-no-hidden PASS] ' ELSE format('[P-other-no-hidden FAIL %s] ', n) END;
  UPDATE public.community_posts SET title = 'TESTES-1 vandalizado' WHERE id = p_pub;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[P-other-edit PASS 0 rows] ' ELSE '[P-other-edit FAIL] ' END;
  DELETE FROM public.community_posts WHERE id = p_pub;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[P-other-delete PASS 0 rows] ' ELSE '[P-other-delete FAIL] ' END;

  -- ---------- Reactions ----------
  INSERT INTO public.community_post_reactions (post_id, user_id, reaction) VALUES (p_pub, tour, 'like')
    RETURNING user_id INTO who;
  r := r || CASE WHEN who = other THEN '[R-user-forced PASS] ' ELSE '[R-user-forced FAIL] ' END;

  -- ---------- Reports ----------
  INSERT INTO public.community_reports (post_id, reporter_id, reason, status)
    VALUES (p_pub, tour, 'spam', 'action_taken') RETURNING id, reporter_id, status INTO rep, who, st;
  r := r || CASE WHEN who = other AND st = 'pending' THEN '[D-create PASS forced reporter+pending] ' ELSE format('[D-create FAIL %s/%s] ', who, st) END;
  UPDATE public.community_reports SET status = 'dismissed' WHERE id = rep;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 0 THEN '[D-reporter-resolve PASS 0 rows] ' ELSE '[D-reporter-resolve FAIL] ' END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_reports WHERE id = rep;
  r := r || CASE WHEN n = 0 THEN '[D-author-cannot-read PASS] ' ELSE '[D-author-cannot-read FAIL] ' END;
  -- The author deletes their own (hidden) post.
  DELETE FROM public.community_posts WHERE id = p_hid;
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || CASE WHEN n = 1 THEN '[P-author-delete PASS] ' ELSE format('[P-author-delete FAIL %s] ', n) END;
  RESET ROLE;

  SET LOCAL ROLE anon;
  -- anon may hold the default SELECT grant, but no policy lets it see any report.
  BEGIN
    SELECT count(*) INTO n FROM public.community_reports;
    r := r || CASE WHEN n = 0 THEN '[D-anon PASS 0 rows] ' ELSE format('[D-anon FAIL reads %s] ', n) END;
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[D-anon PASS denied] ';
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.community_reports SET status = 'action_taken' WHERE id = rep;
  SELECT status, resolved_by INTO st, who FROM public.community_reports WHERE id = rep;
  r := r || CASE WHEN st = 'action_taken' AND who = adm
                  AND (SELECT resolved_at FROM public.community_reports WHERE id = rep) IS NOT NULL
             THEN '[D-admin-resolve PASS stamped] ' ELSE format('[D-admin-resolve FAIL %s/%s] ', st, who) END;
  RESET ROLE;

  -- ---------- Community experiences ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.community_experiences
    (title_pt, title_en, description_pt, description_en, province_id, category, status, submitted_by, image_path)
    VALUES ('TESTES-1 proposta', 'TESTES-1 proposal', 'Descrição', 'Description', prov, 'culture', 'pending', tour,
            tour::text || '/testes-1.jpg')
    RETURNING id, status INTO ce_pend, st;
  r := r || CASE WHEN st = 'pending' THEN '[CE-submit PASS pending] ' ELSE format('[CE-submit FAIL %s] ', st) END;
  -- No UPDATE policy for non-admins: either 0 rows or the guard trigger refuses.
  BEGIN
    UPDATE public.community_experiences SET status = 'approved' WHERE id = ce_pend;
    SELECT status INTO st FROM public.community_experiences WHERE id = ce_pend;
    r := r || CASE WHEN st = 'pending' THEN '[CE-self-approve PASS still pending] ' ELSE format('[CE-self-approve FAIL %s] ', st) END;
  EXCEPTION WHEN others THEN r := r || '[CE-self-approve PASS refused] ';
  END;
  SELECT count(*) INTO n FROM public.community_experiences WHERE id = ce_pend;
  r := r || CASE WHEN n = 1 THEN '[CE-author-sees-own PASS] ' ELSE '[CE-author-sees-own FAIL] ' END;
  RESET ROLE;

  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.community_experiences WHERE id = ce_pend;
  r := r || CASE WHEN n = 0 THEN '[CE-anon-no-pending PASS] ' ELSE '[CE-anon-no-pending FAIL] ' END;
  SELECT count(*) INTO n FROM public.community_experiences WHERE NOT (status = 'approved' AND active);
  r := r || CASE WHEN n = 0 THEN '[CE-anon-only-approved-active PASS] ' ELSE format('[CE-anon-only-approved-active FAIL %s] ', n) END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_experiences WHERE id = ce_pend;
  r := r || CASE WHEN n = 0 THEN '[CE-other-no-pending PASS] ' ELSE '[CE-other-no-pending FAIL] ' END;
  RESET ROLE;

  -- Photos: pretend the object exists, then check who may read it (skipped if storage refuses
  -- direct SQL inserts on this project).
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('community-photos', tour::text || '/testes-1.jpg', tour);
    photo := true;
  EXCEPTION WHEN others THEN r := r || format('[F-setup NOT RUN: %s] ', SQLERRM);
  END;
  IF photo THEN
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'community-photos' AND name = tour::text || '/testes-1.jpg';
    r := r || CASE WHEN n = 0 THEN '[F-anon-pending PASS hidden] ' ELSE '[F-anon-pending FAIL] ' END;
  EXCEPTION WHEN others THEN r := r || format('[F-anon-pending ERROR %s] ', SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'community-photos' AND name = tour::text || '/testes-1.jpg';
  r := r || CASE WHEN n = 1 THEN '[F-own PASS] ' ELSE '[F-own FAIL] ' END;
  RESET ROLE;
  END IF;

  -- Admin approves: notification for the author, photo becomes public.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.community_experiences SET status = 'approved' WHERE id = ce_pend;
  SELECT status INTO st FROM public.community_experiences WHERE id = ce_pend;
  r := r || CASE WHEN st = 'approved' THEN '[CE-admin-approve PASS] ' ELSE format('[CE-admin-approve FAIL %s] ', st) END;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = tour AND title_en = 'Experience approved' AND body_pt LIKE '%TESTES-1 proposta%';
  r := r || CASE WHEN n = 1 THEN '[CE-notify PASS] ' ELSE format('[CE-notify FAIL %s] ', n) END;
  IF photo THEN
    SET LOCAL ROLE anon;
    BEGIN
      SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'community-photos' AND name = tour::text || '/testes-1.jpg';
      r := r || CASE WHEN n = 1 THEN '[F-anon-approved PASS visible] ' ELSE '[F-anon-approved FAIL] ' END;
    EXCEPTION WHEN others THEN r := r || format('[F-anon-approved ERROR %s] ', SQLERRM);
    END;
    RESET ROLE;
  END IF;

  RAISE EXCEPTION 'TEST_COMMUNITY_ROLLBACK %', r;
END $$;
