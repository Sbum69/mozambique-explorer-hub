-- Games + achievements + rewards on top of points_ledger (server is the only authority).

-- 1) Ledger: XP vs redeemable balance. Redemptions are negative rows, never counted as XP.
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_kind_check;
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_check;
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_type_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_kind_check CHECK (kind IN ('award','reversal','redemption'));
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_check CHECK (reason IN ('booking_completed','route_stop_proof','route_completed','game_completed','reward_redeemed'));
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_source_type_check CHECK (source_type IN ('booking','route_stop','route','game','reward_redemption'));

-- 2) Game catalogue (keys match the existing /games challenges).
CREATE TABLE public.game_catalog (
  key text PRIMARY KEY,
  category text NOT NULL,
  xp integer NOT NULL CHECK (xp >= 0),
  total integer NOT NULL CHECK (total >= 1),
  verification text NOT NULL CHECK (verification IN ('quiz','photo','record')),
  unlock_after text REFERENCES public.game_catalog(key),
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.game_catalog TO anon, authenticated;
GRANT ALL ON public.game_catalog TO service_role;
ALTER TABLE public.game_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Game catalog is readable" ON public.game_catalog FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.game_catalog(key,category,xp,total,verification,unlock_after,sort_order) VALUES
 ('g1','tesouro',150,5,'photo',NULL,1),('g2','tesouro',200,8,'photo',NULL,2),('g3','tesouro',180,3,'photo',NULL,3),
 ('g5','foto',100,3,'photo',NULL,5),('g6','foto',120,3,'photo',NULL,6),('g7','foto',140,4,'photo',NULL,7),('g8','foto',90,1,'photo',NULL,8),
 ('g9','experiencia',200,1,'photo',NULL,9),('g10','experiencia',130,1,'photo',NULL,10),('g11','experiencia',0,3,'record',NULL,11),
 ('g13','conhecimento',50,1,'quiz',NULL,13),('g14','conhecimento',60,1,'quiz',NULL,14),
 ('g16','tempo',0,6,'record',NULL,16),('g17','tempo',160,2,'photo',NULL,17),
 ('g19','social',0,1,'record',NULL,19),('g20','social',0,3,'record',NULL,20),('g21','social',0,2,'record',NULL,21);
INSERT INTO public.game_catalog(key,category,xp,total,verification,unlock_after,sort_order) VALUES
 ('g4','tesouro',250,4,'photo','g3',4),('g12','experiencia',220,1,'photo','g9',12),
 ('g15','conhecimento',0,5,'record','g11',15),('g18','tempo',240,3,'photo','g16',18);

-- 3) Quiz bank (answers never exposed directly; only via per-attempt RPCs).
CREATE TABLE public.game_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL UNIQUE,
  question_pt text NOT NULL,
  options_pt text[] NOT NULL,
  correct_index integer NOT NULL,
  explanation_pt text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
GRANT ALL ON public.game_quiz_questions TO service_role;
ALTER TABLE public.game_quiz_questions ENABLE ROW LEVEL SECURITY;
INSERT INTO public.game_quiz_questions(position,question_pt,options_pt,correct_index,explanation_pt) VALUES
 (1,'Em que ano Moçambique se tornou independente?',ARRAY['1965','1975','1980','1992'],1,'Moçambique conquistou a independência a 25 de Junho de 1975.'),
 (2,'Qual é a moeda oficial de Moçambique?',ARRAY['Kwanza','Metical','Rand','Escudo'],1,'A moeda oficial é o Metical (MZN).'),
 (3,'Quem foi o primeiro Presidente de Moçambique?',ARRAY['Eduardo Mondlane','Samora Machel','Joaquim Chissano','Armando Guebuza'],1,'Samora Machel foi o primeiro Presidente do país independente.'),
 (4,'Qual é o prato nacional?',ARRAY['Cachupa','Matapa com Xima','Funje','Muamba'],1,'Matapa com Xima é considerado o prato nacional.'),
 (5,'Que animal está na bandeira de Moçambique?',ARRAY['Leão','Águia','Nenhum (tem um AK-47)','Elefante'],2,'A bandeira não tem animais — tem um AK-47, único caso no mundo.'),
 (6,'Qual é o género musical tradicional mais conhecido?',ARRAY['Kizomba','Marrabenta','Semba','Kuduro'],1,'A Marrabenta é o género musical urbano mais emblemático.'),
 (7,'Quantas províncias tem Moçambique?',ARRAY['9','10','11','12'],2,'Moçambique tem 11 províncias, incluindo a Cidade de Maputo.'),
 (8,'Qual a língua mais falada no norte de Moçambique?',ARRAY['Changana','Sena','Makhuwa','Ronga'],2,'O Makhuwa é a língua bantu mais falada no norte.'),
 (9,'Como se diz ''Obrigado'' em Changana?',ARRAY['Asante','Kanimambo','Inkomu','Obrigadu'],2,'Em Changana, ''Obrigado'' diz-se ''Inkomu''.'),
 (10,'Qual destas é uma praia no arquipélago de Bazaruto?',ARRAY['Tofo','Wimbi','Benguerra','Ponta do Ouro'],2,'Benguerra é uma das ilhas do arquipélago de Bazaruto.');

-- 4) Participation history.
CREATE TABLE public.game_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_key text NOT NULL REFERENCES public.game_catalog(key),
  question_ids uuid[] NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_count integer NOT NULL DEFAULT 0,
  passed boolean,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX game_quiz_attempts_user ON public.game_quiz_attempts(user_id, started_at DESC);

CREATE TABLE public.game_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_key text NOT NULL REFERENCES public.game_catalog(key),
  step_ref text NOT NULL,
  proof_path text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_steps_once UNIQUE (user_id, game_key, step_ref)
);
CREATE UNIQUE INDEX game_steps_proof_once ON public.game_steps(proof_path) WHERE proof_path IS NOT NULL;

CREATE TABLE public.game_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_key text NOT NULL REFERENCES public.game_catalog(key),
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_completions_once UNIQUE (user_id, game_key)
);

GRANT SELECT ON public.game_quiz_attempts, public.game_steps, public.game_completions TO authenticated;
GRANT ALL ON public.game_quiz_attempts, public.game_steps, public.game_completions TO service_role;
ALTER TABLE public.game_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own quiz attempts" ON public.game_quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own game steps" ON public.game_steps FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own game completions" ON public.game_completions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Award XP once per completed game.
CREATE OR REPLACE FUNCTION public.points_on_game_completed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _xp integer;
BEGIN
  SELECT xp INTO _xp FROM public.game_catalog WHERE key = NEW.game_key;
  IF COALESCE(_xp,0) > 0 THEN
    INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
    VALUES (NEW.user_id,_xp,'award','game_completed','game',NEW.id)
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER game_completions_points_trg AFTER INSERT ON public.game_completions FOR EACH ROW EXECUTE FUNCTION public.points_on_game_completed();
REVOKE ALL ON FUNCTION public.points_on_game_completed() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.game_assert_playable(_game_key text) RETURNS public.game_catalog
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.game_catalog;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO g FROM public.game_catalog WHERE key = _game_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_game'; END IF;
  IF g.unlock_after IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.game_completions WHERE user_id = auth.uid() AND game_key = g.unlock_after) THEN
    RAISE EXCEPTION 'game_locked';
  END IF;
  IF EXISTS (SELECT 1 FROM public.game_completions WHERE user_id = auth.uid() AND game_key = _game_key) THEN
    RAISE EXCEPTION 'already_completed';
  END IF;
  RETURN g;
END $$;
REVOKE ALL ON FUNCTION public.game_assert_playable(text) FROM PUBLIC, anon, authenticated;

-- Photo/record challenge step.
CREATE OR REPLACE FUNCTION public.submit_game_step(_game_key text, _step_ref text, _proof_path text, _details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.game_catalog; uid uuid := auth.uid(); n integer; ref text; done boolean := false;
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
  ELSE
    _proof_path := NULL;
    ref := COALESCE(ref, gen_random_uuid()::text);
  END IF;
  IF length(ref) > 200 THEN RAISE EXCEPTION 'invalid_step'; END IF;
  INSERT INTO public.game_steps(user_id,game_key,step_ref,proof_path,details)
  VALUES (uid,_game_key,ref,_proof_path,COALESCE(_details,'{}'::jsonb))
  ON CONFLICT ON CONSTRAINT game_steps_once DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'step_already_done'; END IF;
  SELECT count(*) INTO n FROM public.game_steps WHERE user_id=uid AND game_key=_game_key;
  IF n >= g.total THEN
    INSERT INTO public.game_completions(user_id,game_key) VALUES (uid,_game_key) ON CONFLICT DO NOTHING;
    done := true;
  END IF;
  RETURN jsonb_build_object('progress',LEAST(n,g.total),'total',g.total,'completed',done,'xp_awarded',CASE WHEN done THEN g.xp ELSE 0 END);
END $$;

-- Quiz: server picks questions, records each answer once, scores at the end.
CREATE OR REPLACE FUNCTION public.start_game_quiz(_game_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.game_catalog; ids uuid[]; aid uuid;
BEGIN
  g := public.game_assert_playable(_game_key);
  IF g.verification <> 'quiz' THEN RAISE EXCEPTION 'not_a_quiz'; END IF;
  SELECT array_agg(id) INTO ids FROM (SELECT id FROM public.game_quiz_questions WHERE active ORDER BY random() LIMIT 7) s;
  IF ids IS NULL THEN RAISE EXCEPTION 'no_questions'; END IF;
  INSERT INTO public.game_quiz_attempts(user_id,game_key,question_ids) VALUES (auth.uid(),_game_key,ids) RETURNING id INTO aid;
  RETURN jsonb_build_object('attempt_id',aid,'questions',
    (SELECT jsonb_agg(jsonb_build_object('id',q.id,'question',q.question_pt,'options',to_jsonb(q.options_pt)) ORDER BY t.ord)
       FROM unnest(ids) WITH ORDINALITY t(qid,ord) JOIN public.game_quiz_questions q ON q.id=t.qid));
END $$;

CREATE OR REPLACE FUNCTION public.answer_game_quiz(_attempt_id uuid, _question_id uuid, _choice integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.game_quiz_attempts; q public.game_quiz_questions; ok boolean;
BEGIN
  SELECT * INTO a FROM public.game_quiz_attempts WHERE id=_attempt_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_attempt'; END IF;
  IF a.finished_at IS NOT NULL THEN RAISE EXCEPTION 'attempt_finished'; END IF;
  IF NOT (_question_id = ANY(a.question_ids)) THEN RAISE EXCEPTION 'question_not_in_attempt'; END IF;
  IF a.answers ? _question_id::text THEN RAISE EXCEPTION 'already_answered'; END IF;
  SELECT * INTO q FROM public.game_quiz_questions WHERE id=_question_id;
  ok := (_choice = q.correct_index);
  UPDATE public.game_quiz_attempts SET answers = answers || jsonb_build_object(_question_id::text,_choice),
    correct_count = correct_count + CASE WHEN ok THEN 1 ELSE 0 END WHERE id=_attempt_id;
  RETURN jsonb_build_object('correct',ok,'correct_index',q.correct_index,'explanation',q.explanation_pt);
END $$;

CREATE OR REPLACE FUNCTION public.finish_game_quiz(_attempt_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.game_quiz_attempts; g public.game_catalog; total integer; pass boolean; awarded integer := 0;
BEGIN
  SELECT * INTO a FROM public.game_quiz_attempts WHERE id=_attempt_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_attempt'; END IF;
  IF a.finished_at IS NOT NULL THEN RAISE EXCEPTION 'attempt_finished'; END IF;
  total := array_length(a.question_ids,1);
  IF (SELECT count(*) FROM jsonb_object_keys(a.answers)) < total THEN RAISE EXCEPTION 'unanswered_questions'; END IF;
  SELECT * INTO g FROM public.game_catalog WHERE key=a.game_key;
  pass := a.correct_count * 10 >= total * 7; -- 70% to pass
  UPDATE public.game_quiz_attempts SET finished_at=now(), passed=pass WHERE id=_attempt_id;
  IF pass THEN
    INSERT INTO public.game_completions(user_id,game_key) VALUES (auth.uid(),a.game_key) ON CONFLICT DO NOTHING;
    IF FOUND THEN awarded := g.xp; END IF;
  END IF;
  RETURN jsonb_build_object('correct',a.correct_count,'total',total,'passed',pass,'xp_awarded',awarded);
END $$;

REVOKE ALL ON FUNCTION public.submit_game_step(text,text,text,jsonb), public.start_game_quiz(text), public.answer_game_quiz(uuid,uuid,integer), public.finish_game_quiz(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_game_step(text,text,text,jsonb), public.start_game_quiz(text), public.answer_game_quiz(uuid,uuid,integer), public.finish_game_quiz(uuid) TO authenticated;

-- 5) Storage policies for private game proofs (own folder; no update/delete).
CREATE POLICY "Users upload own game proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own game proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'game-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

-- 6) Rewards (admin-managed catalogue; empty until real rewards exist) and redemptions.
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_pt text NOT NULL,
  title_en text,
  description_pt text,
  description_en text,
  cost_points integer NOT NULL CHECK (cost_points > 0),
  stock integer CHECK (stock IS NULL OR stock >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated;
GRANT INSERT, UPDATE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active rewards readable" ON public.rewards FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert rewards" ON public.rewards FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update rewards" ON public.rewards FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id),
  cost_points integer NOT NULL CHECK (cost_points > 0),
  code text NOT NULL UNIQUE,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reward_redemptions_request_once UNIQUE (user_id, request_id)
);
GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own redemptions" ON public.reward_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); r public.rewards; bal integer; red public.reward_redemptions;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('redeem:' || uid::text));
  SELECT * INTO red FROM public.reward_redemptions WHERE user_id=uid AND request_id=_request_id;
  IF FOUND THEN RETURN jsonb_build_object('redemption_id',red.id,'code',red.code,'duplicate',true); END IF;
  SELECT * INTO r FROM public.rewards WHERE id=_reward_id FOR UPDATE;
  IF NOT FOUND OR NOT r.active THEN RAISE EXCEPTION 'reward_unavailable'; END IF;
  IF r.stock IS NOT NULL AND r.stock <= 0 THEN RAISE EXCEPTION 'out_of_stock'; END IF;
  SELECT COALESCE(sum(points),0) INTO bal FROM public.points_ledger WHERE user_id=uid;
  IF bal < r.cost_points THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  INSERT INTO public.reward_redemptions(user_id,reward_id,cost_points,code,request_id)
  VALUES (uid,r.id,r.cost_points,'EK-' || upper(substr(md5(gen_random_uuid()::text),1,10)),_request_id) RETURNING * INTO red;
  INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
  VALUES (uid,-r.cost_points,'redemption','reward_redeemed','reward_redemption',red.id);
  IF r.stock IS NOT NULL THEN UPDATE public.rewards SET stock = stock - 1 WHERE id=r.id; END IF;
  RETURN jsonb_build_object('redemption_id',red.id,'code',red.code,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid,uuid) TO authenticated;

-- 7) XP (never reduced by redemptions) vs redeemable balance; leaderboard by XP.
CREATE OR REPLACE FUNCTION public.my_points_total() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(sum(points),0)::int FROM public.points_ledger WHERE user_id = auth.uid() AND kind <> 'redemption'
$$;
CREATE OR REPLACE FUNCTION public.my_points_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'xp', COALESCE(sum(points) FILTER (WHERE kind <> 'redemption'),0)::int,
    'balance', COALESCE(sum(points),0)::int)
  FROM public.points_ledger WHERE user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.points_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE(rank integer, display_name text, xp integer, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH t AS (
    SELECT l.user_id, sum(l.points)::int AS xp FROM public.points_ledger l
    WHERE l.kind <> 'redemption' GROUP BY l.user_id HAVING sum(l.points) > 0
  ), r AS (
    SELECT t.*, (rank() OVER (ORDER BY t.xp DESC))::int AS rk FROM t
  )
  SELECT r.rk, COALESCE(NULLIF(split_part(btrim(p.display_name),' ',1),''), NULL), r.xp, r.user_id = auth.uid()
  FROM r LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE auth.uid() IS NOT NULL AND (r.rk <= LEAST(GREATEST(_limit,1),100) OR r.user_id = auth.uid())
  ORDER BY r.rk
$$;
REVOKE ALL ON FUNCTION public.my_points_summary(), public.points_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_points_summary(), public.points_leaderboard(integer) TO authenticated;