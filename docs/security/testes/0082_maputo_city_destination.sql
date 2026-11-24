-- =====================================================================================
-- Guião de teste da PROPOSTA 0082 — destino da Cidade de Maputo
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura): SELECT count(*) FROM public.destinations;  -- guardar (igual no fim)
--
-- Como correr: BEGIN; colar drizzle/migrations/0082_maputo_city_destination.sql; colar o bloco DO;
-- ROLLBACK;   Termina SEMPRE com TEST_0082_ROLLBACK.
--
-- Casos:
--   D1  a província 'maputo-cidade' tem exatamente 1 destino (o 'maputo' de hoje OU o novo)  → [D1 OK]
--   D2  se já havia o 'maputo', a migração não criou 'cidade-de-maputo' (sem duplicado)        → [D2 OK]
--   D3  o anon vê o destino da cidade (catálogo público)                                       → [D3 OK]
--   M1  informativo: quantos destinos tem a província de Maputo (esperado 0: [DECIDIR])        → [M1 n]
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  had_maputo boolean := EXISTS (SELECT 1 FROM public.destinations d JOIN public.provinces p ON p.id = d.province_id
                                 WHERE d.slug = 'maputo' AND p.code = 'maputo-cidade');
BEGIN
  SELECT count(*) INTO n FROM public.destinations d JOIN public.provinces p ON p.id = d.province_id
   WHERE p.code = 'maputo-cidade';
  r := r || CASE WHEN n = 1 THEN '[D1 OK] ' ELSE '[D1 ERRO ' || n || '] ' END;

  IF had_maputo THEN
    SELECT count(*) INTO n FROM public.destinations WHERE slug = 'cidade-de-maputo';
    r := r || CASE WHEN n = 0 THEN '[D2 OK sem efeito] ' ELSE '[D2 ERRO duplicado] ' END;
  ELSE
    r := r || '[D2 n/a: criou cidade-de-maputo] ';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.destinations d JOIN public.provinces p ON p.id = d.province_id
   WHERE p.code = 'maputo-cidade';
  RESET ROLE;
  r := r || CASE WHEN n >= 1 THEN '[D3 OK] ' ELSE '[D3 ERRO] ' END;

  SELECT count(*) INTO n FROM public.destinations d JOIN public.provinces p ON p.id = d.province_id
   WHERE p.code LIKE 'maputo%' AND p.code <> 'maputo-cidade';
  r := r || '[M1 província de Maputo: ' || n || ' destino(s)] ';

  RAISE EXCEPTION 'TEST_0082_ROLLBACK %', r;
END $$;
