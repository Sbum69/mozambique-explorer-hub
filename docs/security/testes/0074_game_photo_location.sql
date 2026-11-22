-- =====================================================================================
-- Guião de teste da PROPOSTA 0074 — flag de localização nas provas "photo" (desligada)
-- -------------------------------------------------------------------------------------
-- Como correr: BEGIN; colar drizzle/migrations/0074_game_photo_location_flag.sql; colar o bloco
-- DO; ROLLBACK;   Termina SEMPRE com TEST_0074_ROLLBACK (o ficheiro de prova falso, os passos e
-- a flag ligada só existem dentro da transação).
--
-- Casos:
--   L0  flag desligada por defeito (game_photo_location_required() = false)       → OK
--   L1  flag DESLIGADA, foto sem localização → aceite (comportamento atual)      → OK
--   L2  flag LIGADA, foto sem localização → ERRO esperado 'location_required'    → [L2 OK]
--   L3  flag LIGADA, precisão 500 m → ERRO esperado 'location_required'           → [L3 OK]
--   L4  flag LIGADA, lat/lng válidos e precisão 30 m → aceite                     → OK
--   L5  flag LIGADA, sem ficheiro de prova → continua 'proof_required'            → [L5 OK]
--   G1  grants de submit_game_step iguais (anon sem EXECUTE)                      → OK
-- Usa um turista sem passos no jogo escolhido (escolhido pelo papel, sem emails).
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  res jsonb;
  g text;
  tour uuid;
  p1 text; p2 text; p3 text;
BEGIN
  -- jogo 'photo' sem pré-requisito, ativo e com pelo menos 3 passos
  SELECT key INTO g FROM public.game_catalog
   WHERE verification = 'photo' AND unlock_after IS NULL AND total >= 3 ORDER BY sort_order LIMIT 1;
  SELECT ur.user_id INTO tour FROM public.user_roles ur
   WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.game_steps s WHERE s.user_id = ur.user_id AND s.game_key = g)
     AND NOT EXISTS (SELECT 1 FROM public.game_completions c WHERE c.user_id = ur.user_id AND c.game_key = g)
   ORDER BY ur.user_id LIMIT 1;
  IF g IS NULL OR tour IS NULL THEN RAISE EXCEPTION 'TEST_0074_ROLLBACK [SETUP ERRO game=% tour=%]', g, tour; END IF;

  r := r || CASE WHEN NOT public.game_photo_location_required() THEN '[L0 OK] ' ELSE '[L0 ERRO] ' END;
  r := r || CASE WHEN NOT has_function_privilege('anon',
            'public.submit_game_step(text, text, text, jsonb, double precision, double precision, double precision)', 'EXECUTE')
            THEN '[G1 OK] ' ELSE '[G1 ERRO] ' END;

  -- ficheiros de prova falsos (só existem nesta transação)
  p1 := tour::text || '/teste-0074-1.jpg'; p2 := tour::text || '/teste-0074-2.jpg'; p3 := tour::text || '/teste-0074-3.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES
    ('game-proofs', p1, tour), ('game-proofs', p2, tour), ('game-proofs', p3, tour);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    res := public.submit_game_step(g, 'teste-0074-1', p1, '{}'::jsonb, NULL, NULL, NULL);
    r := r || '[L1 OK] ';
  EXCEPTION WHEN OTHERS THEN r := r || format('[L1 ERRO %s] ', SQLERRM); END;
  RESET ROLE;

  -- ligar a flag só nesta transação
  CREATE OR REPLACE FUNCTION public.game_photo_location_required() RETURNS boolean
   LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $f$ SELECT true $f$;

  SET LOCAL ROLE authenticated;
  BEGIN
    res := public.submit_game_step(g, 'teste-0074-2', p2, '{}'::jsonb, NULL, NULL, NULL);
    r := r || '[L2 ERRO aceitou] ';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM LIKE '%location_required%' THEN '[L2 OK] ' ELSE format('[L2 ERRO %s] ', SQLERRM) END;
  END;
  BEGIN
    res := public.submit_game_step(g, 'teste-0074-2', p2, '{}'::jsonb, -25.97, 32.57, 500);
    r := r || '[L3 ERRO aceitou] ';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM LIKE '%location_required%' THEN '[L3 OK] ' ELSE format('[L3 ERRO %s] ', SQLERRM) END;
  END;
  BEGIN
    res := public.submit_game_step(g, 'teste-0074-3', p3, '{}'::jsonb, -25.97, 32.57, 30);
    r := r || '[L4 OK] ';
  EXCEPTION WHEN OTHERS THEN r := r || format('[L4 ERRO %s] ', SQLERRM); END;
  BEGIN
    res := public.submit_game_step(g, 'teste-0074-x', tour::text || '/nao-existe.jpg', '{}'::jsonb, -25.97, 32.57, 30);
    r := r || '[L5 ERRO aceitou] ';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM LIKE '%proof_required%' THEN '[L5 OK] ' ELSE format('[L5 ERRO %s] ', SQLERRM) END;
  END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_0074_ROLLBACK %', r;
END $$;
-- Depois do ROLLBACK (leitura):
--   SELECT count(*) FROM game_steps WHERE step_ref LIKE 'teste-0074%';                 -- 0
--   SELECT count(*) FROM storage.objects WHERE name LIKE '%/teste-0074-%';             -- 0
--   SELECT public.game_photo_location_required();  -- erro "não existe" se a 0074 não foi aplicada
