-- =====================================================================================
-- FAV-1 — Favoritos e preferências (migração 0041)
-- -------------------------------------------------------------------------------------
-- O que testa: favoritos só do próprio, validação dos itens, anon sem acesso, save_my_preferences valida tudo ou nada.
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database).
-- Resultado esperado: erro TEST_FAV1_ROLLBACK sem nenhum '…!' (os '!' marcam falhas). Tudo é revertido.
-- Última execução registada (antes de passar para o repositório):
--   TEST_FAV1_ROLLBACK add place + duplicate ignored -> rows=1; public route ok; no active
--   experience to test; missing place refused; bad experience id refused; unknown experience
--   refused; other user private route refused; insert for another user refused; update denied;
--   tourist sees 2; other user sees 0; other user deleted 0; anon denied; anon prefs denied; owner
--   deleted 1; invalid province refused; invalid province in list refused; invalid interest
--   refused; invalid duration refused; profile unchanged=t, provinces unchanged
-- Confirmar depois, por leitura: SELECT count(*) FROM favorites WHERE item_id = 'maputo' AND created_at > now() - interval '1 hour';  -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur
                 WHERE ur.role = 'tourist'
                   AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role = 'admin')
                   AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = ur.user_id)
                 ORDER BY ur.user_id LIMIT 1);
  biz  uuid := (SELECT owner_id FROM public.businesses WHERE owner_id IS NOT NULL ORDER BY created_at LIMIT 1);
  exp_id text := (SELECT id::text FROM public.experiences WHERE active LIMIT 1);
  public_route text := (SELECT id::text FROM public.routes WHERE is_public AND status='active' AND review_status='approved' LIMIT 1);
  private_route text := (SELECT id::text FROM public.routes WHERE NOT is_public AND owner_id IS DISTINCT FROM tour LIMIT 1);
  prof_before text;
  pp_before text;
BEGIN
  SELECT row(province, duration_days, interests)::text INTO prof_before FROM public.profiles WHERE id = tour;
  SELECT coalesce(string_agg(province_id::text, ',' ORDER BY province_id), '') INTO pp_before FROM public.profile_provinces WHERE profile_id = tour;

  -- Tourist
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.favorites (item_type, item_id) VALUES ('place', 'maputo');
  INSERT INTO public.favorites (item_type, item_id) VALUES ('place', 'maputo') ON CONFLICT DO NOTHING;
  SELECT count(*) INTO n FROM public.favorites WHERE item_id = 'maputo';
  r := r || format('add place + duplicate ignored -> rows=%s; ', n);
  IF public_route IS NOT NULL THEN
    INSERT INTO public.favorites (item_type, item_id) VALUES ('itinerary', public_route);
    r := r || 'public route ok; ';
  END IF;
  IF exp_id IS NOT NULL THEN
    INSERT INTO public.favorites (item_type, item_id) VALUES ('experience', exp_id);
    r := r || 'experience ok; ';
  ELSE r := r || 'no active experience to test; '; END IF;
  BEGIN INSERT INTO public.favorites (item_type, item_id) VALUES ('place', 'nao-existe'); r := r || 'MISSING PLACE ACCEPTED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'missing place refused; '; END;
  BEGIN INSERT INTO public.favorites (item_type, item_id) VALUES ('experience', 'abc'); r := r || 'BAD UUID ACCEPTED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'bad experience id refused; '; END;
  BEGIN INSERT INTO public.favorites (item_type, item_id) VALUES ('experience', gen_random_uuid()::text); r := r || 'UNKNOWN EXP ACCEPTED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'unknown experience refused; '; END;
  IF private_route IS NOT NULL THEN
    BEGIN INSERT INTO public.favorites (item_type, item_id) VALUES ('itinerary', private_route); r := r || 'OTHERS PRIVATE ROUTE ACCEPTED!; ';
    EXCEPTION WHEN raise_exception THEN r := r || 'other user private route refused; '; END;
  END IF;
  BEGIN INSERT INTO public.favorites (user_id, item_type, item_id) VALUES (biz, 'place', 'pemba'); r := r || 'FOREIGN USER_ID ACCEPTED!; ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'insert for another user refused; '; END;
  BEGIN UPDATE public.favorites SET item_id = 'pemba'; r := r || 'UPDATE ALLOWED!; ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'update denied; '; END;
  SELECT count(*) INTO n FROM public.favorites;
  r := r || format('tourist sees %s; ', n);
  RESET ROLE;

  -- Another user
  PERFORM set_config('request.jwt.claims', json_build_object('sub', biz, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.favorites;
  r := r || format('other user sees %s; ', n);
  DELETE FROM public.favorites WHERE item_id = 'maputo';
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || format('other user deleted %s; ', n);
  RESET ROLE;

  -- Anonymous
  SET LOCAL ROLE anon;
  BEGIN PERFORM count(*) FROM public.favorites; r := r || 'ANON READS!; ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'anon denied; '; END;
  BEGIN PERFORM public.save_my_preferences('maputo', 3, '{}'); r := r || 'ANON SAVES PREFS!; ';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'anon prefs denied; '; END;
  RESET ROLE;

  -- Tourist removes own favourite
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  DELETE FROM public.favorites WHERE item_id = 'maputo';
  GET DIAGNOSTICS n = ROW_COUNT;
  r := r || format('owner deleted %s; ', n);

  -- Preferences: invalid input saves nothing
  BEGIN PERFORM public.save_my_preferences('atlantida', 5, ARRAY['beach'], ARRAY['gaza']); r := r || 'BAD PROVINCE SAVED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'invalid province refused; '; END;
  BEGIN PERFORM public.save_my_preferences('gaza', 5, ARRAY['beach'], ARRAY['gaza','atlantida']); r := r || 'BAD PROVINCE LIST SAVED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'invalid province in list refused; '; END;
  BEGIN PERFORM public.save_my_preferences('gaza', 5, ARRAY['ski'], NULL); r := r || 'BAD INTEREST SAVED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'invalid interest refused; '; END;
  BEGIN PERFORM public.save_my_preferences('gaza', 0, '{}', NULL); r := r || 'BAD DURATION SAVED!; ';
  EXCEPTION WHEN raise_exception THEN r := r || 'invalid duration refused; '; END;
  RESET ROLE;
  r := r || format('profile unchanged=%s, provinces unchanged=%s; ',
    (SELECT row(province, duration_days, interests)::text FROM public.profiles WHERE id = tour) = prof_before,
    (SELECT coalesce(string_agg(province_id::text, ',' ORDER BY province_id), '') FROM public.profile_provinces WHERE profile_id = tour) = pp_before);

  -- Preferences: valid input saves profile and provinces together
  SET LOCAL ROLE authenticated;
  PERFORM public.save_my_preferences('gaza', 4, ARRAY['beach','nature'], ARRAY['gaza','maputo']);
  RESET ROLE;
  r := r || format('valid save -> profile=%s provinces=%s',
    (SELECT row(province, duration_days, interests)::text FROM public.profiles WHERE id = tour),
    (SELECT string_agg(p.code, ',' ORDER BY p.code) FROM public.profile_provinces x JOIN public.provinces p ON p.id = x.province_id WHERE x.profile_id = tour));

  RAISE EXCEPTION 'TEST_FAV1_ROLLBACK %', r;
END $$;
