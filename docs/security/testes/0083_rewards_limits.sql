-- =====================================================================================
-- Guião de teste da PROPOSTA 0083 — limites das recompensas na BD
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar): linhas que já passam os limites (esperado: 0).
--   SELECT id, cost_points, stock FROM public.rewards WHERE cost_points > 100000 OR stock > 100000;
--   SELECT count(*) FROM public.rewards;  -- guardar (igual no fim)
--
-- Como correr: BEGIN; colar drizzle/migrations/0083_rewards_limits.sql; colar o bloco DO; ROLLBACK;
-- Termina SEMPRE com TEST_0083_ROLLBACK.
--
-- Casos (como o dono de um negócio aprovado, com RLS):
--   L1  criar com custo 100 000 e stock 100 000 → aceita            → [L1 OK]
--   L2  criar com custo 100 001 → recusa (check_violation)          → [L2 OK]
--   L3  criar com stock 100 001 → recusa                            → [L3 OK]
--   L4  stock vazio (ilimitado) continua aceite                     → [L4 OK]
-- Se não houver negócio aprovado com dono, os casos ficam NÃO CORRIDOS.
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  biz uuid;
  owner uuid;
BEGIN
  SELECT b.id, b.owner_id INTO biz, owner FROM public.businesses b
   WHERE b.status = 'approved' AND b.owner_id IS NOT NULL ORDER BY b.created_at LIMIT 1;
  IF biz IS NULL THEN
    RAISE EXCEPTION 'TEST_0083_ROLLBACK [NÃO CORRIDO: sem negócio aprovado com dono]';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'TEST_0083 L1', 100000, 100000);
    r := r || '[L1 OK] ';
  EXCEPTION WHEN OTHERS THEN r := r || '[L1 ERRO ' || SQLERRM || '] '; END;

  BEGIN
    INSERT INTO public.rewards (business_id, title_pt, cost_points) VALUES (biz, 'TEST_0083 L2', 100001);
    r := r || '[L2 ERRO aceitou] ';
  EXCEPTION WHEN check_violation THEN r := r || '[L2 OK] '; END;

  BEGIN
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'TEST_0083 L3', 10, 100001);
    r := r || '[L3 ERRO aceitou] ';
  EXCEPTION WHEN check_violation THEN r := r || '[L3 OK] '; END;

  BEGIN
    INSERT INTO public.rewards (business_id, title_pt, cost_points, stock) VALUES (biz, 'TEST_0083 L4', 10, NULL);
    r := r || '[L4 OK] ';
  EXCEPTION WHEN OTHERS THEN r := r || '[L4 ERRO ' || SQLERRM || '] '; END;

  RESET ROLE;
  RAISE EXCEPTION 'TEST_0083_ROLLBACK %', r;
END $$;
