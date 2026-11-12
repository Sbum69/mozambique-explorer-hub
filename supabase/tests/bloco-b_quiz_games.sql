-- Bloco B (0065 + 0066): run AFTER the migrations; self-reverting. Uses the internal tourist test
-- account (chosen by role: internal, tourist only). A temporary quiz game 'tq' is created and
-- rolled back with everything else.
DO $$
DECLARE r text := ''; uid uuid; res jsonb; q jsonb; qid uuid; att uuid; perm jsonb; corr int; shown int; ok boolean; n int;
BEGIN
  SELECT p.id INTO uid FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.id
   WHERE p.is_internal AND ur.role='tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles x WHERE x.user_id=p.id AND x.role<>'tourist') LIMIT 1;
  SELECT count(*) INTO n FROM public.game_quiz_questions WHERE active;
  r := r || 'active=' || n || '; ';
  SELECT count(*) INTO n FROM public.game_quiz_questions WHERE active AND (question_en IS NULL OR source_url IS NULL OR cardinality(options_en) <> cardinality(options_pt));
  r := r || CASE WHEN n = 0 THEN 'PASS every question has EN + source; ' ELSE 'FAIL missing EN/source '||n||'; ' END;
  SELECT count(*) INTO n FROM public.game_catalog WHERE key LIKE 'pp-%';
  r := r || CASE WHEN n = 11 THEN 'PASS 11 passports; ' ELSE 'FAIL passports '||n||'; ' END;
  INSERT INTO public.game_catalog(key, category, xp, total, verification, sort_order) VALUES ('tq','conhecimento',0,1,'quiz',99);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := public.start_game_quiz('tq', 'en');
  att := (res->>'attempt_id')::uuid;
  r := r || CASE WHEN jsonb_array_length(res->'questions') = 7 THEN 'PASS 7 questions; ' ELSE 'FAIL n questions; ' END;
  q := res->'questions'->0; qid := (q->>'id')::uuid;
  RESET ROLE;
  SELECT option_orders->qid::text INTO perm FROM public.game_quiz_attempts WHERE id = att;
  SELECT correct_index INTO corr FROM public.game_quiz_questions WHERE id = qid;
  SELECT (k-1)::int INTO shown FROM jsonb_array_elements_text(perm) WITH ORDINALITY e(v,k) WHERE v::int = corr;
  ok := (q->'options'->>shown) = (SELECT options_en[corr+1] FROM public.game_quiz_questions WHERE id = qid);
  r := r || CASE WHEN ok THEN 'PASS shuffled options map back (EN); ' ELSE 'FAIL option mapping; ' END;
  SET LOCAL ROLE authenticated;
  res := public.answer_game_quiz(att, qid, shown);
  r := r || CASE WHEN (res->>'correct')::boolean AND (res->>'correct_index')::int = shown THEN 'PASS answer by shown position; ' ELSE 'FAIL answer '||res::text||'; ' END;
  BEGIN PERFORM public.submit_game_step('pp-gaza', NULL, NULL, '{}'::jsonb);
    r := r || 'CRITICAL passport by submit; '; EXCEPTION WHEN raise_exception THEN r := r || 'PASS passport not by submit_game_step; '; END;
  BEGIN PERFORM public.claim_route_games(gen_random_uuid());
    r := r || 'FAIL claim unknown progress; '; EXCEPTION WHEN raise_exception THEN r := r || 'PASS claim needs own proven progress; '; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN PERFORM public.claim_route_games(gen_random_uuid());
    r := r || 'CRITICAL anon claim; '; EXCEPTION WHEN insufficient_privilege THEN r := r || 'PASS anon cannot claim; '; END;
  BEGIN SELECT count(*) INTO n FROM public.game_quiz_questions;
    r := r || CASE WHEN n = 0 THEN 'PASS anon sees no questions; ' ELSE 'CRITICAL anon reads questions; ' END;
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'PASS anon cannot read questions; '; END;
  RESET ROLE;
  RAISE EXCEPTION 'TEST_BLOCO_B_ROLLBACK %', r;
END $$;
