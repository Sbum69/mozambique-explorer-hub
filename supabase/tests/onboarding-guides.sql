-- Self-reverting test of 0068 (first-entry guide). Run as one DO block; it always ends with
-- RAISE EXCEPTION 'TEST_GUIDES_ROLLBACK …', so nothing stays in the database.
-- Users are picked by role (internal test accounts), never by email.
DO $t$
DECLARE tourist uuid; other uuid; r record; other_guide text; failed boolean; anon_refused boolean;
BEGIN
  -- (the migration body is pasted here by the runner: ALTER TABLE … + set_my_guide)
  SELECT p.id INTO tourist FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'tourist'
   WHERE p.is_internal ORDER BY p.created_at LIMIT 1;
  SELECT p.id INTO other FROM profiles p WHERE p.id <> tourist ORDER BY p.created_at LIMIT 1;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', tourist, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.set_my_guide('tourist', 'completed');
  PERFORM public.set_my_guide('business', 'dismissed');

  -- invalid values are refused
  failed := false; BEGIN PERFORM public.set_my_guide('tourist', 'done'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'invalid status accepted'; END IF;
  failed := false; BEGIN PERFORM public.set_my_guide('admin', 'completed'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'unknown guide accepted'; END IF;

  -- a user cannot write another profile's guide directly (RLS: own row only)
  UPDATE profiles SET guide_tourist = 'skipped' WHERE id = other;

  SELECT p.guide_tourist, p.guide_tourist_at IS NOT NULL AS t_at, p.guide_business
    INTO r FROM profiles p WHERE p.id = tourist;
  RESET ROLE;
  -- read the other profile outside the tourist's role (under RLS the tourist cannot even see it)
  SELECT guide_tourist INTO other_guide FROM profiles WHERE id = other;

  -- visitors (anon) cannot call it
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  anon_refused := false; BEGIN PERFORM public.set_my_guide('tourist', 'completed'); EXCEPTION WHEN OTHERS THEN anon_refused := true; END;
  RESET ROLE;

  -- Result of 2026-11-14: tourist=completed at=t business=dismissed other_unchanged=t anon_refused=t
  RAISE EXCEPTION 'TEST_GUIDES_ROLLBACK tourist=% at=% business=% other_unchanged=% anon_refused=%',
    r.guide_tourist, r.t_at, r.guide_business, other_guide IS NULL, anon_refused;
END $t$;
