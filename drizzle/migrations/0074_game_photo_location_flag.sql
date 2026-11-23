-- 0074 — Regra (DESLIGADA) para exigir localização nas provas "photo" dos jogos (PROPOSTA, não aplicada).
--
-- PROBLEMA
--   Em submit_game_step (0066) a localização das provas com foto é só registada
--   (location_verified fica NULL porque os locais dos jogos não têm coordenadas de referência).
--   Quando houver recompensas reais, uma foto sem localização não deve dar XP.
--
-- O QUE MUDA
--   1. Nova função public.game_photo_location_required() → false. É a "flag": DESLIGADA por defeito.
--   2. submit_game_step é recriada com o MESMO corpo da 0066 e mais um passo: SÓ se a flag devolver
--      true, uma prova 'photo' sem localização válida (lat/lng no intervalo, precisão conhecida e
--      ≤ 200 m, o mesmo limite de proof_location_check) é recusada com 'location_required'. O passo
--      não fica gravado e por isso não conta para a conclusão nem dá XP.
--   Com a flag desligada, o comportamento é IGUAL ao atual (mesmos argumentos, mesmos erros, mesmo
--   resultado).
--
-- O QUE NÃO MUDA
--   Assinatura e grants de submit_game_step (CREATE OR REPLACE mantém os da 0038), quizzes,
--   claim_route_games, provas dos roteiros, points_ledger, tabelas.
--
-- COMO LIGAR (numa migração própria, quando houver recompensas reais)
--   CREATE OR REPLACE FUNCTION public.game_photo_location_required() RETURNS boolean
--    LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$ SELECT true $$;
--   O frontend já traduz 'location_required' (src/lib/games.ts, gameErrorText).
--
-- COMO REVERTER
--   Recriar submit_game_step com o corpo da 0066 e DROP FUNCTION public.game_photo_location_required();
--
-- Teste: docs/security/testes/0074_game_photo_location.sql

CREATE OR REPLACE FUNCTION public.game_photo_location_required()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT false $function$;

REVOKE ALL ON FUNCTION public.game_photo_location_required() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_photo_location_required() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_game_step(_game_key text, _step_ref text, _proof_path text, _details jsonb, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _accuracy_m double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE g public.game_catalog; uid uuid := auth.uid(); n integer; ref text; done boolean := false; chk record;
  located boolean;
BEGIN
  IF _game_key LIKE 'pp-%' OR _game_key = 'gv' THEN RAISE EXCEPTION 'use_route_claim'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text || ':' || _game_key));
  g := public.game_assert_playable(_game_key);
  IF g.verification = 'quiz' THEN RAISE EXCEPTION 'use_quiz'; END IF;
  ref := NULLIF(btrim(COALESCE(_step_ref,'')),'');
  IF g.verification = 'photo' THEN
    IF _proof_path IS NULL OR split_part(_proof_path,'/',1) <> uid::text
       OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='game-proofs' AND o.name=_proof_path) THEN
      RAISE EXCEPTION 'proof_required';
    END IF;
    -- Flag (desligada por defeito): com ela ligada, a foto só conta com uma localização válida.
    IF public.game_photo_location_required() THEN
      located := _lat IS NOT NULL AND _lng IS NOT NULL
             AND _lat BETWEEN -90 AND 90 AND _lng BETWEEN -180 AND 180
             AND _accuracy_m IS NOT NULL AND _accuracy_m >= 0 AND _accuracy_m <= 200;
      IF NOT located THEN RAISE EXCEPTION 'location_required'; END IF;
    END IF;
    ref := COALESCE(ref, _proof_path);
    -- Game places have no reference coordinates in the database yet: the result is recorded (null).
    SELECT * INTO chk FROM public.proof_location_check(NULL, NULL, _lat, _lng, _accuracy_m);
  ELSE
    _proof_path := NULL;
    ref := COALESCE(ref, gen_random_uuid()::text);
    SELECT * INTO chk FROM public.proof_location_check(NULL, NULL, NULL, NULL, NULL);
  END IF;
  IF length(ref) > 200 THEN RAISE EXCEPTION 'invalid_step'; END IF;
  INSERT INTO public.game_steps(user_id,game_key,step_ref,proof_path,details,location_verified,location_distance_m,location_accuracy_m)
  VALUES (uid,_game_key,ref,_proof_path,COALESCE(_details,'{}'::jsonb),chk.verified,chk.distance_m,chk.accuracy_m)
  ON CONFLICT ON CONSTRAINT game_steps_once DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'step_already_done'; END IF;
  SELECT count(*) INTO n FROM public.game_steps WHERE user_id=uid AND game_key=_game_key;
  IF n >= g.total THEN
    INSERT INTO public.game_completions(user_id,game_key) VALUES (uid,_game_key) ON CONFLICT DO NOTHING;
    done := true;
  END IF;
  RETURN jsonb_build_object('progress',LEAST(n,g.total),'total',g.total,'completed',done,
    'xp_awarded',CASE WHEN done THEN g.xp ELSE 0 END,'location_verified',chk.verified);
END $function$;
