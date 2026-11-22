-- =====================================================================================
-- Guião de teste da PROPOSTA 0071 — community_post_authors com security_invoker
-- -------------------------------------------------------------------------------------
-- Como correr (Lovable Cloud → SQL, tudo numa só execução):
--   1. BEGIN;
--   2. colar o conteúdo de drizzle/migrations/0071_community_post_authors_invoker.sql
--   3. colar o bloco DO abaixo
--   4. ROLLBACK;
-- O bloco termina SEMPRE com o erro TEST_0071_ROLLBACK (nada fica gravado).
-- Esperado: todos os itens [… OK …]; nenhum [… ERRO …].
--
-- Casos:
--   V1  a vista tem security_invoker=on                                   → OK
--   V2  colunas = id, display_name, avatar_url (iguais às de antes)        → OK
--   A1  anon vê o autor de uma publicação 'published'                      → OK
--   A2  anon NÃO vê quem só tem publicações não publicadas                 → OK
--   T1  o próprio autor vê-se a si mesmo com uma publicação pendente      → OK
--   T2  outro utilizador autenticado NÃO o vê                              → OK
--   D1  admin com sessão aal2 vê-o (moderação)                             → OK
--   D2  admin com sessão aal1 NÃO o vê (regra da 0050)                     → OK
--   G1  anon não lê profiles diretamente (continua sem grant)              → OK
-- Antes e depois, por leitura: nenhuma publicação 'TESTE-0071%' fica gravada.
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  adm uuid := (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1);
  pub_author uuid := (SELECT author_id FROM public.community_posts WHERE status = 'published' ORDER BY created_at LIMIT 1);
  lonely uuid;  -- perfil sem nenhuma publicação publicada
  other uuid;
  cat uuid := (SELECT id FROM public.community_categories ORDER BY sort_order LIMIT 1);
BEGIN
  SELECT p.id INTO lonely FROM public.profiles p
   WHERE NOT EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.author_id = p.id AND cp.status = 'published')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = p.id AND a.role = 'admin')
   ORDER BY p.id LIMIT 1;
  SELECT p.id INTO other FROM public.profiles p
   WHERE p.id <> lonely AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = p.id AND a.role = 'admin')
   ORDER BY p.id DESC LIMIT 1;
  IF adm IS NULL OR pub_author IS NULL OR lonely IS NULL OR other IS NULL OR cat IS NULL THEN
    RAISE EXCEPTION 'TEST_0071_ROLLBACK [SETUP ERRO adm=% pub=% lonely=% other=% cat=%]', adm, pub_author, lonely, other, cat;
  END IF;

  -- Publicação pendente do "lonely", criada como postgres (sem sessão). Se o trigger da comunidade
  -- forçar 'published' na criação, o UPDATE seguinte repõe 'pending'.
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO public.community_posts (author_id, title, content, category_id, status)
    VALUES (lonely, 'TESTE-0071 pendente', 'teste', cat, 'pending');
  UPDATE public.community_posts SET status = 'pending' WHERE title = 'TESTE-0071 pendente';

  SELECT count(*) INTO n FROM pg_class c WHERE c.relname = 'community_post_authors'
     AND 'security_invoker=on' = ANY (coalesce(c.reloptions, '{}'));
  r := r || CASE WHEN n = 1 THEN '[V1 OK] ' ELSE '[V1 ERRO] ' END;
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'community_post_authors'
     AND column_name IN ('id', 'display_name', 'avatar_url');
  r := r || CASE WHEN n = 3 AND (SELECT count(*) FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'community_post_authors') = 3
            THEN '[V2 OK] ' ELSE '[V2 ERRO] ' END;

  -- anon
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.community_post_authors WHERE id = pub_author;
  r := r || CASE WHEN n = 1 THEN '[A1 OK] ' ELSE '[A1 ERRO] ' END;
  SELECT count(*) INTO n FROM public.community_post_authors WHERE id = lonely;
  r := r || CASE WHEN n = 0 THEN '[A2 OK] ' ELSE '[A2 ERRO] ' END;
  BEGIN
    PERFORM 1 FROM public.profiles LIMIT 1;
    r := r || '[G1 ERRO anon lê profiles] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[G1 OK] ';
  END;
  RESET ROLE;

  -- o próprio
  PERFORM set_config('request.jwt.claims', json_build_object('sub', lonely, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_post_authors WHERE id = lonely;
  r := r || CASE WHEN n = 1 THEN '[T1 OK] ' ELSE '[T1 ERRO] ' END;
  RESET ROLE;

  -- outro utilizador
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_post_authors WHERE id = lonely;
  r := r || CASE WHEN n = 0 THEN '[T2 OK] ' ELSE '[T2 ERRO] ' END;
  RESET ROLE;

  -- admin aal2 e aal1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_post_authors WHERE id = lonely;
  r := r || CASE WHEN n = 1 THEN '[D1 OK] ' ELSE '[D1 ERRO] ' END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.community_post_authors WHERE id = lonely;
  r := r || CASE WHEN n = 0 THEN '[D2 OK] ' ELSE '[D2 ERRO] ' END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_0071_ROLLBACK %', r;
END $$;
-- Depois do ROLLBACK:  SELECT count(*) FROM community_posts WHERE title LIKE 'TESTE-0071%';  -- 0
