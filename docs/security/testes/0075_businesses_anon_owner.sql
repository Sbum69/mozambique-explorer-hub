-- =====================================================================================
-- Guião de teste da PROPOSTA 0075 — anon sem owner_id / rejection_reason em businesses
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar):
--   a) o anon NÃO pode ter SELECT na tabela inteira (a 0073 retirou-o). Se der true, o REVOKE por
--      colunas da 0075 não tem efeito: parar e rever.
--        SELECT has_table_privilege('anon', 'public.businesses', 'SELECT');          -- esperado: false
--   b) colunas que o anon lê hoje (esperado: as 18 do GRANT da 0073):
--        SELECT column_name FROM information_schema.column_privileges
--         WHERE table_schema = 'public' AND table_name = 'businesses'
--           AND grantee = 'anon' AND privilege_type = 'SELECT' ORDER BY 1;
--   c) nenhuma política avaliada pelo anon lê businesses.owner_id (esperado: 0 linhas):
--        SELECT schemaname, tablename, policyname, roles FROM pg_policies
--         WHERE (qual ILIKE '%owner_id%' OR with_check ILIKE '%owner_id%')
--           AND (qual ILIKE '%businesses%' OR with_check ILIKE '%businesses%')
--           AND ('anon' = ANY (roles) OR 'public' = ANY (roles));
--
-- Como correr: BEGIN; colar drizzle/migrations/0075_businesses_anon_hide_owner.sql; colar o bloco DO;
-- ROLLBACK;   Termina SEMPRE com TEST_0075_ROLLBACK.
--
-- Casos (anon):
--   C1  colunas do catálogo (local-businesses.ts)                    → OK
--   C2  page-meta (name, description, location)                       → OK
--   C3  sitemap (id, updated_at)                                      → OK
--   C4  embed experiences → businesses(name, status)                  → OK
--   C5  experiências e disponibilidade públicas (RLS com subconsultas) → OK
--   X1  SELECT owner_id                                               → ERRO esperado → [X1 OK]
--   X2  SELECT rejection_reason                                       → ERRO esperado → [X2 OK]
--   X3  filtro WHERE owner_id = …                                     → ERRO esperado → [X3 OK]
--   R1  o anon continua a ver só negócios aprovados                   → OK
--   U1  authenticated (dono) continua a ler owner_id e rejection_reason → OK
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  owner uuid := (SELECT owner_id FROM public.businesses WHERE owner_id IS NOT NULL ORDER BY created_at LIMIT 1);
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM id, name, description, category_code, province_id, location, contact, images, verified, created_at
      FROM public.businesses WHERE status = 'approved' LIMIT 5;
    r := r || '[C1 OK] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[C1 ERRO] '; END;
  BEGIN PERFORM name, description, location FROM public.businesses LIMIT 1; r := r || '[C2 OK] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[C2 ERRO] '; END;
  BEGIN PERFORM id, updated_at FROM public.businesses WHERE status = 'approved' LIMIT 1; r := r || '[C3 OK] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[C3 ERRO] '; END;
  BEGIN
    PERFORM e.id, b.name, b.status FROM public.experiences e JOIN public.businesses b ON b.id = e.business_id LIMIT 1;
    r := r || '[C4 OK] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[C4 ERRO] '; END;
  BEGIN
    PERFORM id FROM public.experiences LIMIT 5;
    PERFORM id FROM public.experience_availability LIMIT 5;
    r := r || '[C5 OK] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[C5 ERRO] '; END;
  BEGIN PERFORM owner_id FROM public.businesses LIMIT 1; r := r || '[X1 ERRO leu] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[X1 OK] '; END;
  BEGIN PERFORM rejection_reason FROM public.businesses LIMIT 1; r := r || '[X2 ERRO leu] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[X2 OK] '; END;
  BEGIN PERFORM id FROM public.businesses WHERE owner_id = owner LIMIT 1; r := r || '[X3 ERRO filtrou] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[X3 OK] '; END;
  SELECT count(*) INTO n FROM public.businesses WHERE status <> 'approved';
  r := r || CASE WHEN n = 0 THEN '[R1 OK] ' ELSE '[R1 ERRO] ' END;
  RESET ROLE;

  IF owner IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN PERFORM owner_id, rejection_reason FROM public.businesses WHERE owner_id = owner; r := r || '[U1 OK] ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || '[U1 ERRO] '; END;
    RESET ROLE;
  ELSE
    r := r || '[U1 NÃO CORRIDO sem dono] ';
  END IF;

  RAISE EXCEPTION 'TEST_0075_ROLLBACK %', r;
END $$;
