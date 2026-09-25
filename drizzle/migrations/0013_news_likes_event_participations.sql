CREATE TABLE public.news_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_key text NOT NULL CHECK (char_length(news_key) BETWEEN 1 AND 2048),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, news_key)
);
GRANT SELECT, INSERT, DELETE ON public.news_likes TO authenticated;
GRANT ALL ON public.news_likes TO service_role;
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own news likes" ON public.news_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own news likes" ON public.news_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own news likes" ON public.news_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX news_likes_key_idx ON public.news_likes(news_key);

CREATE TABLE public.event_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL CHECK (char_length(event_key) BETWEEN 1 AND 200),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);
GRANT SELECT, INSERT, DELETE ON public.event_participations TO authenticated;
GRANT ALL ON public.event_participations TO service_role;
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own participations" ON public.event_participations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all participations" ON public.event_participations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users join events" ON public.event_participations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave events" ON public.event_participations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX event_participations_key_idx ON public.event_participations(event_key);

CREATE OR REPLACE FUNCTION public.news_like_counts(_keys text[])
RETURNS TABLE(news_key text, likes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT news_key, count(*)::int FROM public.news_likes WHERE news_key = ANY(_keys) GROUP BY news_key
$$;
CREATE OR REPLACE FUNCTION public.event_participant_counts(_keys text[])
RETURNS TABLE(event_key text, participants integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT event_key, count(*)::int FROM public.event_participations WHERE event_key = ANY(_keys) GROUP BY event_key
$$;
GRANT EXECUTE ON FUNCTION public.news_like_counts(text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_participant_counts(text[]) TO anon, authenticated;