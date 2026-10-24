-- 10B: business rewards with one-time voucher validation, and location-checked photo proofs.
-- Reuses points_ledger, redeem_reward and route_stop_progress. Only new columns, functions,
-- triggers and policies: no existing row is changed (rewards, redemptions, stop proofs and game
-- steps are empty when this runs). The tourist's own coordinates are never stored.

-- ========== 1. Rewards owned by businesses, with validity; vouchers validated once ==========
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS rewards_business_id_idx ON public.rewards (business_id);

ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS used_at timestamptz,
  ADD COLUMN IF NOT EXISTS used_by uuid REFERENCES public.profiles(id);
CREATE INDEX IF NOT EXISTS reward_redemptions_reward_id_idx ON public.reward_redemptions (reward_id);

-- Owners manage the rewards of their own business (only while it is approved to create).
-- Admin policies (insert/update/read all) and "Active rewards readable" are unchanged.
CREATE POLICY "Owners view own business rewards" ON public.rewards FOR SELECT TO authenticated
  USING (business_id IS NOT NULL AND public.owns_business(business_id));
CREATE POLICY "Owners create rewards for own approved business" ON public.rewards FOR INSERT TO authenticated
  WITH CHECK (business_id IS NOT NULL AND public.owns_business(business_id) AND public.commercial_activity_public(business_id));
CREATE POLICY "Owners update own business rewards" ON public.rewards FOR UPDATE TO authenticated
  USING (business_id IS NOT NULL AND public.owns_business(business_id))
  WITH CHECK (business_id IS NOT NULL AND public.owns_business(business_id));

CREATE OR REPLACE FUNCTION public.rewards_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id; NEW.created_at := OLD.created_at;
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      NEW.business_id := OLD.business_id;
    END IF;
  END IF;
  IF NEW.title_pt IS NULL OR btrim(NEW.title_pt) = '' THEN RAISE EXCEPTION 'TITLE_REQUIRED'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
CREATE TRIGGER rewards_guard BEFORE INSERT OR UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.rewards_guard();

-- Same atomic redemption as before, plus validity, approved business and no self-redemption.
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid, _request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); r public.rewards; bal integer; red public.reward_redemptions;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('redeem:' || uid::text));
  SELECT * INTO red FROM public.reward_redemptions WHERE user_id=uid AND request_id=_request_id;
  IF FOUND THEN RETURN jsonb_build_object('redemption_id',red.id,'code',red.code,'duplicate',true); END IF;
  SELECT * INTO r FROM public.rewards WHERE id=_reward_id FOR UPDATE;
  IF NOT FOUND OR NOT r.active THEN RAISE EXCEPTION 'reward_unavailable'; END IF;
  IF r.business_id IS NOT NULL AND NOT public.commercial_activity_public(r.business_id) THEN RAISE EXCEPTION 'reward_unavailable'; END IF;
  IF r.valid_until IS NOT NULL AND r.valid_until < (now() AT TIME ZONE 'Africa/Maputo')::date THEN RAISE EXCEPTION 'reward_expired'; END IF;
  IF r.business_id IS NOT NULL AND public.owns_business(r.business_id) THEN RAISE EXCEPTION 'own_reward'; END IF;
  IF r.stock IS NOT NULL AND r.stock <= 0 THEN RAISE EXCEPTION 'out_of_stock'; END IF;
  SELECT COALESCE(sum(points),0) INTO bal FROM public.points_ledger WHERE user_id=uid;
  IF bal < r.cost_points THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  INSERT INTO public.reward_redemptions(user_id,reward_id,cost_points,code,request_id)
  VALUES (uid,r.id,r.cost_points,'EK-' || upper(substr(md5(gen_random_uuid()::text),1,10)),_request_id) RETURNING * INTO red;
  INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
  VALUES (uid,-r.cost_points,'redemption','reward_redeemed','reward_redemption',red.id);
  IF r.stock IS NOT NULL THEN UPDATE public.rewards SET stock = stock - 1 WHERE id=r.id; END IF;
  RETURN jsonb_build_object('redemption_id',red.id,'code',red.code,'duplicate',false);
END $function$;

-- The business (or an admin) validates a voucher by its code, once.
CREATE OR REPLACE FUNCTION public.validate_voucher(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); red public.reward_redemptions; r public.rewards;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO red FROM public.reward_redemptions WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'voucher_not_found'; END IF;
  SELECT * INTO r FROM public.rewards WHERE id = red.reward_id;
  -- Other businesses' vouchers are reported as not found.
  IF NOT (public.has_role(uid, 'admin'::public.app_role)
          OR (r.business_id IS NOT NULL AND public.owns_business(r.business_id))) THEN
    RAISE EXCEPTION 'voucher_not_found';
  END IF;
  IF red.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('status','already_used','used_at',red.used_at,'redeemed_at',red.created_at,
      'title_pt',r.title_pt,'title_en',COALESCE(r.title_en,r.title_pt),'cost_points',red.cost_points);
  END IF;
  UPDATE public.reward_redemptions SET used_at = now(), used_by = uid WHERE id = red.id;
  RETURN jsonb_build_object('status','validated','used_at',now(),'redeemed_at',red.created_at,
    'title_pt',r.title_pt,'title_en',COALESCE(r.title_en,r.title_pt),'cost_points',red.cost_points);
END $function$;

-- ========== 2. Location check (haversine, 300 m radius, accuracy up to 200 m) ==========
CREATE OR REPLACE FUNCTION public.distance_m(_lat1 double precision, _lng1 double precision, _lat2 double precision, _lng2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT 2 * 6371000 * asin(sqrt(
    power(sin(radians(_lat2 - _lat1) / 2), 2)
    + cos(radians(_lat1)) * cos(radians(_lat2)) * power(sin(radians(_lng2 - _lng1) / 2), 2)))
$function$;

-- verified: true within 300 m with accuracy <= 200 m; false if refused, inaccurate or too far;
-- null when the place has no reference coordinates (manual review).
CREATE OR REPLACE FUNCTION public.proof_location_check(
  _target_lat double precision, _target_lng double precision,
  _lat double precision, _lng double precision, _accuracy_m double precision,
  OUT verified boolean, OUT distance_m numeric, OUT accuracy_m numeric)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE d double precision;
BEGIN
  accuracy_m := CASE WHEN _accuracy_m IS NULL OR _accuracy_m < 0 OR _accuracy_m = 'NaN'::double precision
                     THEN NULL ELSE round(_accuracy_m::numeric, 1) END;
  IF _target_lat IS NULL OR _target_lng IS NULL THEN
    verified := NULL; distance_m := NULL; RETURN;
  END IF;
  IF _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN
    verified := false; distance_m := NULL; RETURN;
  END IF;
  d := public.distance_m(_target_lat, _target_lng, _lat, _lng);
  distance_m := round(d::numeric, 1);
  verified := accuracy_m IS NOT NULL AND accuracy_m <= 200 AND d <= 300;
END $function$;

-- Reference coordinates of a route stop: its own, else its destination's, else the destination of
-- its activity, else its community experience's. Null when none exist.
CREATE OR REPLACE FUNCTION public.route_stop_coords(_stop_id uuid, OUT lat double precision, OUT lng double precision)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.lat::double precision, c.lng::double precision
  FROM public.route_stops s
  LEFT JOIN public.destinations d ON d.id = s.destination_id
  LEFT JOIN public.experiences e ON e.id = s.experience_id
  LEFT JOIN public.destinations ed ON ed.id = e.destination_id
  LEFT JOIN public.community_experiences ce ON ce.id = s.community_experience_id
  CROSS JOIN LATERAL (VALUES (1, s.lat, s.lng), (2, d.lat, d.lng), (3, ed.lat, ed.lng), (4, ce.lat, ce.lng)) AS c(o, lat, lng)
  WHERE s.id = _stop_id AND c.lat IS NOT NULL AND c.lng IS NOT NULL
  ORDER BY c.o
  LIMIT 1
$function$;

-- ========== 3. Route stop proofs: verification status, review, points only when valid ==========
ALTER TABLE public.route_stop_progress
  ADD COLUMN IF NOT EXISTS location_verified boolean,
  ADD COLUMN IF NOT EXISTS location_distance_m numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.route_stop_progress
  ADD CONSTRAINT route_stop_progress_review_status_check
  CHECK (review_status IN ('verified', 'pending', 'approved', 'rejected'));

-- Never store the tourist's coordinates; verification fields are set only by the trusted RPCs.
CREATE OR REPLACE FUNCTION public.route_stop_proof_location_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.lat := NULL; NEW.lng := NULL;
  IF current_setting('ekaya.trusted_proof', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.location_verified := NULL; NEW.location_distance_m := NULL; NEW.location_accuracy_m := NULL;
      NEW.review_status := 'pending'; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
    ELSE
      NEW.location_verified := OLD.location_verified; NEW.location_distance_m := OLD.location_distance_m;
      NEW.location_accuracy_m := OLD.location_accuracy_m; NEW.review_status := OLD.review_status;
      NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER route_stop_progress_location_guard BEFORE INSERT OR UPDATE ON public.route_stop_progress
  FOR EACH ROW EXECUTE FUNCTION public.route_stop_proof_location_guard();

CREATE OR REPLACE FUNCTION public.submit_stop_proof(
  _progress_id uuid, _route_stop_id uuid, _photo_path text,
  _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL, _accuracy_m double precision DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); tgt record; chk record; st text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.route_progress WHERE id = _progress_id AND user_id = uid) THEN
    RAISE EXCEPTION 'PROGRESS_NOT_OWNED';
  END IF;
  SELECT * INTO tgt FROM public.route_stop_coords(_route_stop_id);
  SELECT * INTO chk FROM public.proof_location_check(tgt.lat, tgt.lng, _lat, _lng, _accuracy_m);
  st := CASE WHEN chk.verified THEN 'verified' ELSE 'pending' END;
  PERFORM set_config('ekaya.trusted_proof', 'on', true);
  BEGIN
    INSERT INTO public.route_stop_progress (progress_id, route_stop_id, photo_path,
      location_verified, location_distance_m, location_accuracy_m, review_status)
    VALUES (_progress_id, _route_stop_id, _photo_path, chk.verified, chk.distance_m, chk.accuracy_m, st);
  EXCEPTION WHEN unique_violation THEN
    PERFORM set_config('ekaya.trusted_proof', 'off', true);
    RAISE EXCEPTION 'STOP_ALREADY_PROVEN';
  END;
  PERFORM set_config('ekaya.trusted_proof', 'off', true);
  RETURN jsonb_build_object('review_status', st, 'location_verified', chk.verified,
    'distance_m', chk.distance_m, 'accuracy_m', chk.accuracy_m);
END $function$;

-- Admin decision on a pending proof (unverified or without reference coordinates).
CREATE OR REPLACE FUNCTION public.review_stop_proof(_progress_id uuid, _route_stop_id uuid, _approve boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE st text := CASE WHEN _approve THEN 'approved' ELSE 'rejected' END;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('ekaya.trusted_proof', 'on', true);
  UPDATE public.route_stop_progress
     SET review_status = st, reviewed_by = auth.uid(), reviewed_at = now()
   WHERE progress_id = _progress_id AND route_stop_id = _route_stop_id AND review_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;
  PERFORM set_config('ekaya.trusted_proof', 'off', true);
  RETURN st;
END $function$;

-- Stop points (+20) only for a verified or approved proof; still once per stop (points_ledger_once).
CREATE OR REPLACE FUNCTION public.points_on_stop_proof()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid;
BEGIN
  IF NEW.photo_path IS NULL OR btrim(NEW.photo_path)='' THEN RETURN NEW; END IF;
  IF NEW.review_status NOT IN ('verified', 'approved') THEN RETURN NEW; END IF;
  SELECT user_id INTO uid FROM public.route_progress WHERE id=NEW.progress_id;
  IF uid IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
  VALUES (uid, public.points_value('route_stop_proof'),'award','route_stop_proof','route_stop',NEW.route_stop_id)
  ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS route_stop_progress_points_trg ON public.route_stop_progress;
CREATE TRIGGER route_stop_progress_points_trg AFTER INSERT OR UPDATE OF review_status ON public.route_stop_progress
  FOR EACH ROW EXECUTE FUNCTION public.points_on_stop_proof();

-- A route is complete (and earns +150) only when every stop has a verified or approved proof.
CREATE OR REPLACE FUNCTION public.route_progress_fully_proven(_progress_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id JOIN public.route_progress p ON p.route_id=d.route_id WHERE p.id=_progress_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id JOIN public.route_progress p ON p.route_id=d.route_id
       WHERE p.id=_progress_id AND NOT EXISTS (
         SELECT 1 FROM public.route_stop_progress sp WHERE sp.progress_id=p.id AND sp.route_stop_id=s.id
           AND sp.photo_path IS NOT NULL AND btrim(sp.photo_path)<>''
           AND sp.review_status IN ('verified', 'approved')))
$function$;

-- ========== 4. Game photo steps record the location result (points unchanged) ==========
ALTER TABLE public.game_steps
  ADD COLUMN IF NOT EXISTS location_verified boolean,
  ADD COLUMN IF NOT EXISTS location_distance_m numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric;

DROP FUNCTION IF EXISTS public.submit_game_step(text, text, text, jsonb);
CREATE FUNCTION public.submit_game_step(_game_key text, _step_ref text, _proof_path text, _details jsonb,
  _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL, _accuracy_m double precision DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE g public.game_catalog; uid uuid := auth.uid(); n integer; ref text; done boolean := false; chk record;
BEGIN
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

-- ========== 5. Function access ==========
REVOKE ALL ON FUNCTION public.submit_game_step(text, text, text, jsonb, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_game_step(text, text, text, jsonb, double precision, double precision, double precision) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_stop_proof(uuid, uuid, text, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_stop_proof(uuid, uuid, text, double precision, double precision, double precision) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_stop_proof(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_stop_proof(uuid, uuid, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_voucher(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_voucher(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.route_stop_coords(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rewards_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.route_stop_proof_location_guard() FROM PUBLIC, anon, authenticated;
