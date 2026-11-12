-- 0066 — Games tied to provinces (Bloco B). No new verification type: "record", checked on the server.
-- * "Passaporte de <Província>" (pp-<code>, 11 games, 200 XP): finish a curated, published
--   itinerary of that province with an approved photo at every stop.
-- * "Grande Viagem" (gv, 400 XP): the same for an itinerary with 2 or more provinces.
-- * They are only awarded by claim_route_games(progress); submit_game_step refuses them.
-- * "Quiz de <Província>" games are created only when a province has ≥ 8 verified questions
--   (none has yet: see docs/data/quiz-decisoes.csv).
-- Badges (Sul/Centro/Norte Completo, 11 Províncias) are derived from these completions in the app,
-- like the existing ones (no XP).

INSERT INTO public.game_catalog (key, category, xp, total, verification, unlock_after, sort_order, province_id)
SELECT 'pp-' || p.code, 'tesouro', 200, 1, 'record', NULL, 30 + row_number() OVER (ORDER BY p.code), p.id
  FROM public.provinces p WHERE p.active;
INSERT INTO public.game_catalog (key, category, xp, total, verification, unlock_after, sort_order, province_id)
VALUES ('gv', 'tempo', 400, 1, 'record', NULL, 50, NULL);

CREATE OR REPLACE FUNCTION public.claim_route_games(_progress_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.route_progress; r public.routes; nprov int; v_key text; awarded text[] := '{}';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO p FROM public.route_progress WHERE id = _progress_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_progress'; END IF;
  SELECT * INTO r FROM public.routes WHERE id = p.route_id;
  IF NOT (r.is_curated AND r.is_public AND r.review_status = 'approved' AND r.status = 'active') THEN
    RAISE EXCEPTION 'route_not_eligible';
  END IF;
  IF NOT public.route_progress_fully_proven(_progress_id) THEN RAISE EXCEPTION 'route_not_proven'; END IF;
  SELECT count(*) INTO nprov FROM public.route_provinces WHERE route_id = r.id;
  IF nprov >= 2 THEN
    v_key := 'gv';
  ELSE
    SELECT 'pp-' || code INTO v_key FROM public.provinces WHERE id = r.province_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_catalog WHERE key = v_key) THEN RAISE EXCEPTION 'unknown_game'; END IF;
  INSERT INTO public.game_completions (user_id, game_key) VALUES (auth.uid(), v_key) ON CONFLICT DO NOTHING;
  IF FOUND THEN awarded := ARRAY[v_key]; END IF;
  RETURN jsonb_build_object('game_key', v_key, 'awarded', to_jsonb(awarded));
END $function$;
REVOKE ALL ON FUNCTION public.claim_route_games(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_route_games(uuid) TO authenticated;

-- Same as before, plus: passports and the Grande Viagem can only be claimed through a route.
CREATE OR REPLACE FUNCTION public.submit_game_step(_game_key text, _step_ref text, _proof_path text, _details jsonb, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _accuracy_m double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE g public.game_catalog; uid uuid := auth.uid(); n integer; ref text; done boolean := false; chk record;
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
