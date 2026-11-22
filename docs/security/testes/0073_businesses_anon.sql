-- =====================================================================================
-- Guião de teste da PROPOSTA 0073 — anon sem decided_by / decided_at em businesses
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar): a lista de colunas da produção tem de coincidir com a
-- do GRANT da 0073 mais decided_by e decided_at (20 colunas). Se aparecer outra, acrescentá-la
-- ao GRANT antes de aplicar.
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'businesses' ORDER BY ordinal_position;
--
-- Como correr: BEGIN; colar drizzle/migrations/0073_businesses_anon_hide_decision.sql; colar o
-- bloco DO; ROLLBACK;   Termina SEMPRE com TEST_0073_ROLLBACK.
--
-- Casos (anon):
--   C1  colunas do catálogo (local-businesses.ts)                    → OK
--   C2  page-meta (name, description, location)                       → OK
--   C3  sitemap (id, updated_at)                                      → OK
--   C4  embed experiences → businesses(name, status)                  → OK
--   X1  SELECT decided_by                                             → ERRO esperado → [X1 OK]
--   X2  SELECT decided_at                                             → ERRO esperado → [X2 OK]
--   X3  SELECT *                                                      → ERRO esperado → [X3 OK]
--       (prova de que um select('*') anónimo passaria a falhar; no frontend não há nenhum)
--   R1  o anon continua a ver só negócios aprovados                   → OK
--   U1  authenticated (dono) continua a ler '*' do próprio negócio    → OK
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
  BEGIN PERFORM decided_by FROM public.businesses LIMIT 1; r := r || '[X1 ERRO leu] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[X1 OK] '; END;
  BEGIN PERFORM decided_at FROM public.businesses LIMIT 1; r := r || '[X2 ERRO leu] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[X2 OK] '; END;
  BEGIN PERFORM * FROM public.businesses LIMIT 1; r := r || '[X3 ERRO leu] ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || '[X3 OK] '; END;
  SELECT count(*) INTO n FROM public.businesses WHERE status <> 'approved';
  r := r || CASE WHEN n = 0 THEN '[R1 OK] ' ELSE '[R1 ERRO] ' END;
  RESET ROLE;

  IF owner IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN PERFORM * FROM public.businesses WHERE owner_id = owner; r := r || '[U1 OK] ';
    EXCEPTION WHEN insufficient_privilege THEN r := r || '[U1 ERRO] '; END;
    RESET ROLE;
  ELSE
    r := r || '[U1 NÃO CORRIDO sem dono] ';
  END IF;

  RAISE EXCEPTION 'TEST_0073_ROLLBACK %', r;
END $$;
