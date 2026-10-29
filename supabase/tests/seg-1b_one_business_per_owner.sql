-- =====================================================================================
-- SEG-1B — Um negócio por conta (migração 0034, índice único em businesses.owner_id)
-- -------------------------------------------------------------------------------------
-- O que testa: o dono de um negócio não consegue criar um segundo (erro 23505 no índice
--   businesses_owner_id_key); um perfil sem negócio consegue criar o primeiro.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro SEG1B_TEST_ROLLBACK com [second PASS unique_violation] e
--   [first PASS] (ou [first NOT RUN] se não houver perfis sem negócio). Tudo é revertido.
-- Confirmar: SELECT count(*) FROM businesses WHERE name LIKE 'SEG-1B%';  -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  owner uuid := (SELECT owner_id FROM public.businesses WHERE owner_id IS NOT NULL ORDER BY created_at LIMIT 1);
  free_profile uuid := (SELECT p.id FROM public.profiles p
                         WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = p.id)
                         ORDER BY p.id LIMIT 1);
BEGIN
  IF owner IS NULL THEN
    RAISE EXCEPTION 'SEG1B_TEST_ROLLBACK [SETUP FAIL no business owner]';
  END IF;
  BEGIN
    INSERT INTO public.businesses (owner_id, name, slug, status) VALUES (owner, 'SEG-1B segundo negócio', 'seg-1b-segundo', 'pending');
    r := r || '[second FAIL accepted] ';
  EXCEPTION WHEN unique_violation THEN
    r := r || format('[second PASS unique_violation %s] ', CASE WHEN SQLERRM LIKE '%businesses_owner_id_key%' THEN 'businesses_owner_id_key' ELSE SQLERRM END);
  END;
  IF free_profile IS NULL THEN
    r := r || '[first NOT RUN no profile without a business] ';
  ELSE
    BEGIN
      INSERT INTO public.businesses (owner_id, name, slug, status) VALUES (free_profile, 'SEG-1B primeiro negócio', 'seg-1b-primeiro', 'pending');
      r := r || '[first PASS] ';
    EXCEPTION WHEN others THEN r := r || format('[first FAIL %s] ', SQLERRM);
    END;
  END IF;
  RAISE EXCEPTION 'SEG1B_TEST_ROLLBACK %', r;
END $$;
